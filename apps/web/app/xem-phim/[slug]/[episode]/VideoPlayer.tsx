"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Server, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccountDataStore } from "@/lib/store/useAccountDataStore";
import dynamic from "next/dynamic";
import type { SourceInventory } from "@/lib/player/source-inventory";
import { usePlayerStateMachine } from "@/hooks/usePlayerStateMachine";

const PlyrPlayer = dynamic(() => import("@/components/movie/PlyrPlayer"), { ssr: false });

interface VideoPlayerProps {
  movieSlug: string;
  movieName: string;
  movieThumb: string;
  episode: string;
  episodeName: string;
  inventory: SourceInventory;
  requestedServerIndex?: number;
  prevEpisodeSlug?: string;
  nextEpisodeSlug?: string;
}

export default function VideoPlayer({
  movieSlug,
  movieName,
  movieThumb,
  episode,
  episodeName,
  inventory,
  requestedServerIndex,
  prevEpisodeSlug,
  nextEpisodeSlug,
}: VideoPlayerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTime = searchParams.get("t") ? Math.floor(Number(searchParams.get("t"))) : undefined;

  const playerRef = useRef<any>(null);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    activeSource,
    activeIndex,
    attemptId,
    phase,
    isLoading,
    failedSourceIds,
    savedTime,
    statusMessage,
    reportMediaPlaying,
    reportVideoHealthy,
    reportEmbedLoaded,
    reportSourceError,
    reportBuffering,
    selectSource,
  } = usePlayerStateMachine({
    sources: inventory.sources,
    episodeKey: inventory.episodeKey,
    initialTime,
  });

  const isEmbed = activeSource?.kind === "embed";
  const isFailed = phase === "failed" || !activeSource;
  const hideOverlay = phase === "embed_ready" || phase === "healthy";

  // DB watch progress sync
  const syncToServer = useCallback(async () => {
    if (!playerRef.current) return;
    const isSupabaseEnabled = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    if (!isSupabaseEnabled) return;

    const currentTime = Math.floor(playerRef.current.currentTime || 0);
    const duration = Math.floor(playerRef.current.duration || 0);

    if (duration > 0 && currentTime > 0) {
      try {
        const { updateWatchHistory } = await import("@/app/lich-su/actions");
        await updateWatchHistory({
          movie_slug: movieSlug,
          movie_title: movieName,
          poster_url: movieThumb,
          episode_slug: episode,
          episode_name: episodeName,
          duration,
          playback_time: currentTime,
        });
      } catch (err) {
        console.error("Failed to sync history:", err);
      }
    }
  }, [movieSlug, movieName, movieThumb, episode, episodeName]);

  const handlePlayerReady = (player: any) => {
    playerRef.current = player;

    player.media?.addEventListener("pause", () => {
      pauseTimerRef.current = setTimeout(() => {
        syncToServer();
      }, 5000);
    });

    player.media?.addEventListener("play", () => {
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
      if (activeSource) {
        reportMediaPlaying(activeSource.id, attemptId);
      }
    });
  };

  // Keyboard hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          if (playerRef.current) {
            if (playerRef.current.paused) playerRef.current.play();
            else playerRef.current.pause();
          }
          break;
        case "ArrowLeft":
        case "j":
          e.preventDefault();
          if (playerRef.current) playerRef.current.rewind(10);
          break;
        case "ArrowRight":
        case "l":
          e.preventDefault();
          if (playerRef.current) playerRef.current.forward(10);
          break;
        case "ArrowUp":
          if (nextEpisodeSlug) {
            e.preventDefault();
            router.push(
              `/xem-phim/${movieSlug}/${nextEpisodeSlug}${
                requestedServerIndex !== undefined ? `?sv=${requestedServerIndex}` : ""
              }`
            );
          }
          break;
        case "ArrowDown":
          if (prevEpisodeSlug) {
            e.preventDefault();
            router.push(
              `/xem-phim/${movieSlug}/${prevEpisodeSlug}${
                requestedServerIndex !== undefined ? `?sv=${requestedServerIndex}` : ""
              }`
            );
          }
          break;
        case "m":
          e.preventDefault();
          if (playerRef.current) playerRef.current.muted = !playerRef.current.muted;
          break;
        case "f":
          e.preventDefault();
          if (playerRef.current) playerRef.current.fullscreen?.toggle();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextEpisodeSlug, prevEpisodeSlug, movieSlug, requestedServerIndex, router]);

  return (
    <div className="relative">
      {/* Container with responsive aspect ratio */}
      <div className="group relative aspect-video w-full overflow-hidden rounded-[var(--radius-lg)] border border-white/8 bg-black shadow-[var(--shadow-lg)] max-h-[78vh] sm:max-h-[82vh]">
        {/* Loading / Switching Overlay */}
        <AnimatePresence>
          {isLoading && !hideOverlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/92 p-4 backdrop-blur-sm"
            >
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-2 border-primary/20" />
                <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
              {statusMessage && (
                <p className="animate-pulse text-center text-sm font-medium text-foreground-secondary">
                  {statusMessage}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video Player Render */}
        {!isFailed && activeSource ? (
          isEmbed ? (
            /* Embed iframe fallback mode - ONLY IFRAME RENDERED */
            <div className="relative h-full w-full bg-black">
              <iframe
                key={`${activeSource.id}-${attemptId}`}
                src={activeSource.url}
                className="h-full w-full border-0 relative z-10"
                title={`${movieName} - ${episodeName}`}
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
                referrerPolicy="no-referrer-when-downgrade"
                onLoad={() => reportEmbedLoaded(activeSource.id, attemptId)}
                onError={() => reportSourceError(activeSource.id, attemptId, "embed_load_error")}
              />
              <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-md bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">
                Máy chủ dự phòng ({activeSource.label}) — Đang sử dụng bản chiếu nhúng
              </div>
            </div>
          ) : (
            /* HLS Plyr mode - ONLY PLYR PLAYER RENDERED */
            <div className="h-full w-full">
              <PlyrPlayer
                key={`${activeSource.id}-${attemptId}`}
                sourceId={activeSource.id}
                attemptId={attemptId}
                hlsUrl={activeSource.url}
                startTime={savedTime || initialTime}
                onReady={handlePlayerReady}
                onPlaying={() => reportMediaPlaying(activeSource.id, attemptId)}
                onVideoHealthy={() => reportVideoHealthy(activeSource.id, attemptId)}
                onWaiting={() => reportBuffering()}
                onError={(reason) => reportSourceError(activeSource.id, attemptId, reason)}
              />
            </div>
          )
        ) : (
          /* Error state when all candidates failed */
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background-secondary p-6 text-center">
            <AlertCircle className="h-10 w-10 text-error" />
            <p className="text-base font-bold text-white">Không thể phát tập này từ các máy chủ hiện tại</p>
            <p className="max-w-md text-xs text-foreground-muted">
              Vui lòng bấm chọn máy chủ bên dưới để thử lại hoặc chọn một tập phim khác.
            </p>
            <button
              type="button"
              onClick={() => inventory.sources[0] && selectSource(inventory.sources[0].id)}
              className="button-primary min-h-9 px-4 text-xs font-semibold"
            >
              Thử lại từ nguồn chính
            </button>
          </div>
        )}

        {/* Quick next episode button overlay */}
        {nextEpisodeSlug && (
          <div className="absolute bottom-4 right-4 z-20 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/xem-phim/${movieSlug}/${nextEpisodeSlug}${
                    requestedServerIndex !== undefined ? `?sv=${requestedServerIndex}` : ""
                  }`
                )
              }
              className="button-secondary min-h-9 gap-1.5 px-3 py-1.5 text-xs backdrop-blur-md"
            >
              Tập tiếp theo
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Manual Server Selector Bar */}
      <div className="mt-4 surface-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground-muted">
            <Server className="h-4 w-4 text-primary" />
            <span>Chọn máy chủ phát:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {inventory.sources.map((src, idx) => {
              const isActive = activeIndex === idx;
              const isFailedSrc = failedSourceIds.includes(src.id);

              return (
                <button
                  key={src.id}
                  type="button"
                  onClick={() => selectSource(src.id)}
                  className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-primary text-white shadow-md shadow-primary/20 ring-1 ring-primary"
                      : isFailedSrc
                      ? "border border-error/30 bg-error/10 text-error/80 hover:border-error/50"
                      : "border border-white/10 bg-white/5 text-foreground-secondary hover:border-white/20 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isActive
                        ? "bg-white animate-pulse"
                        : isFailedSrc
                        ? "bg-error"
                        : "bg-success"
                    }`}
                  />
                  <span>{src.label}</span>
                  <span className="text-[10px] opacity-75 uppercase">
                    ({src.kind})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
