"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Server } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccountDataStore } from "@/lib/store/useAccountDataStore";
import dynamic from "next/dynamic";

const PlyrPlayer = dynamic(() => import("@/components/movie/PlyrPlayer"), { ssr: false });

interface VideoPlayerProps {
    movieSlug: string;
    movieName: string;
    movieThumb: string;
    episode: string;
    episodeName: string;
    embedUrl: string;
    m3u8Url: string;
    prevEpisodeSlug?: string;
    nextEpisodeSlug?: string;
    serverIndex?: number;
    nguonCData?: any;
    phimApiData?: any;
}

export default function VideoPlayer({
    movieSlug,
    movieName,
    movieThumb,
    episode,
    episodeName,
    embedUrl,
    m3u8Url,
    prevEpisodeSlug,
    nextEpisodeSlug,
    serverIndex,
    nguonCData,
    phimApiData,
}: VideoPlayerProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialTime = searchParams.get('t') ? Math.floor(Number(searchParams.get('t'))) : undefined;
    const playerRef = useRef<any>(null);
    const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);

    const updateWatchProgress = useAccountDataStore((state) => state.updateWatchProgress);
    const [isLoading, setIsLoading] = useState(false);

    // Start with pending states while we check availability
    const [useEmbed, setUseEmbed] = useState<boolean>(false);
    const [currentEmbedUrl, setCurrentEmbedUrl] = useState<string | null>(null);
    const [currentM3u8Url, setCurrentM3u8Url] = useState<string | null>(null);
    const [activeSource, setActiveSource] = useState<"op-m3u8" | "op-embed" | "nc-m3u8" | "nc-embed" | "pa-m3u8" | "pa-embed" | null>(null);
    const [availability, setAvailability] = useState<Record<string, boolean | null>>({});
    const [isCheckingSources, setIsCheckingSources] = useState(true);

    // NguonC mapping - improved matching for slugs or names
    const nguonCEpisode = nguonCData?.movie?.episodes?.[0]?.items?.find((item: any) => {
        const normItemSlug = item.slug.replace(/^tap-/, '').replace(/^0+/, '').toLowerCase();
        const normCurrentSlug = episode.replace(/^tap-/, '').replace(/^0+/, '').toLowerCase();
        const normItemName = item.name.replace(/^tap\s/i, '').replace(/^0+/, '').toLowerCase();
        const normCurrentName = episodeName?.replace(/^tap\s/i, '').replace(/^0+/, '').toLowerCase();
        
        return normItemSlug === normCurrentSlug || normItemName === normCurrentName || item.slug === episode;
    });
    const ncEmbed = nguonCEpisode?.embed;
    const ncM3u8 = nguonCEpisode?.m3u8;

    // PhimApi mapping
    const phimApiEpisode = phimApiData?.episodes?.[0]?.server_data?.find((item: any) => {
        const normItemSlug = item.slug.replace(/^tap-/, '').replace(/^0+/, '').toLowerCase();
        const normCurrentSlug = episode.replace(/^tap-/, '').replace(/^0+/, '').toLowerCase();
        const normItemName = item.name.replace(/^tap\s/i, '').replace(/^0+/, '').toLowerCase();
        const normCurrentName = episodeName?.replace(/^tap\s/i, '').replace(/^0+/, '').toLowerCase();

        return normItemSlug === normCurrentSlug || normItemName === normCurrentName || item.slug === episode;
    });
    const paEmbed = phimApiEpisode?.link_embed;
    const paM3u8 = phimApiEpisode?.link_m3u8;

    // Select highest priority available source directly without HEAD preflight requests
    useEffect(() => {
        setIsCheckingSources(false);
        const sources = [
            { key: "op-m3u8", url: m3u8Url, type: "m3u8" },
            { key: "nc-m3u8", url: ncM3u8, type: "m3u8" },
            { key: "pa-m3u8", url: paM3u8, type: "m3u8" },
            { key: "op-embed", url: embedUrl, type: "embed" },
            { key: "nc-embed", url: ncEmbed, type: "embed" },
            { key: "pa-embed", url: paEmbed, type: "embed" },
        ];

        const selected = sources.find((s) => Boolean(s.url));
        if (selected) {
            setActiveSource(selected.key as any);
            if (selected.type === "m3u8") {
                setCurrentM3u8Url(selected.url);
                setUseEmbed(false);
            } else {
                setCurrentEmbedUrl(selected.url);
                setUseEmbed(true);
            }
        } else {
            setActiveSource(null);
            setCurrentM3u8Url(null);
            setCurrentEmbedUrl(null);
        }
    }, [embedUrl, m3u8Url, ncEmbed, ncM3u8, paEmbed, paM3u8, episode]);

    // ─── OPTIMIZED SYNC STRATEGY ───
    const syncToServer = useCallback(async () => {
        if (!playerRef.current) return;
        const isSupabaseEnabled = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
        if (!isSupabaseEnabled) return;

        const currentTime = Math.floor(playerRef.current.currentTime || 0);
        const duration = Math.floor(playerRef.current.duration || 0);

        if (duration > 0 && currentTime > 0) {
            try {
                const { updateWatchHistory } = await import('@/app/lich-su/actions');
                await updateWatchHistory({
                    movie_slug: movieSlug,
                    movie_title: movieName,
                    poster_url: movieThumb,
                    episode_slug: episode,
                    episode_name: episodeName,
                    duration,
                    playback_time: currentTime,
                });
                console.log("🎬 DB Progress Synced");
            } catch (err) {
                console.error('Failed to sync history:', err);
            }
        }
    }, [movieSlug, movieName, movieThumb, episode, episodeName]);

    // Handle sync on navigation or tab close
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                syncToServer();
            }
        };

        window.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            syncToServer(); // Sync on internal unmount
            window.removeEventListener("visibilitychange", handleVisibilityChange);
            if (pauseTimerRef.current) {
                clearTimeout(pauseTimerRef.current);
            }
        };
    }, [syncToServer]);

    // Keep responsive progress state in memory between server syncs.
    useEffect(() => {
        const saveInterval = setInterval(() => {
            if (playerRef.current && !playerRef.current.paused) {
                const currentTime = Math.floor(playerRef.current.currentTime || 0);
                const duration = Math.floor(playerRef.current.duration || 0);

                if (duration > 0 && currentTime > 0) {
                    updateWatchProgress(movieSlug, { episode, episodeName, currentTime, duration, updatedAt: Date.now() });
                }
            }
        }, 10000);

        return () => clearInterval(saveInterval);
    }, [movieSlug, episode, episodeName, updateWatchProgress]);

    const togglePlay = useCallback(() => {
        playerRef.current?.togglePlay();
    }, []);

    const skipTime = useCallback((amount: number) => {
        if (!playerRef.current) return;
        if (amount > 0) playerRef.current.forward(amount);
        else playerRef.current.rewind(Math.abs(amount));
    }, []);

    // Called by PlyrPlayer once Plyr + HLS are ready
    const handlePlayerReady = (player: any) => {
        playerRef.current = player;

        // Bắt sự kiện sync sau 5s pause
        player.media.addEventListener('pause', () => {
            pauseTimerRef.current = setTimeout(() => {
                syncToServer();
            }, 5000);
        });

        player.media.addEventListener('play', () => {
            if (pauseTimerRef.current) {
                clearTimeout(pauseTimerRef.current);
                pauseTimerRef.current = null;
            }
        });

        // Show overlay only during actual mid-playback buffering, not initial load
        player.media.addEventListener('waiting', () => setIsLoading(true));
        player.media.addEventListener('playing', () => setIsLoading(false));
    };

    // Switch to embed mode: PlyrPlayer unmounts → its cleanup destroys Plyr + HLS
    const switchToEmbed = useCallback((url: string, sourceKey: any) => {
        playerRef.current = null;
        setIsLoading(false);
        setCurrentEmbedUrl(url);
        setUseEmbed(true);
        setActiveSource(sourceKey);
    }, []);

    const switchToM3u8 = useCallback((url: string, sourceKey: any) => {
        setIsLoading(true);
        setCurrentM3u8Url(url);
        setUseEmbed(false);
        setActiveSource(sourceKey);
    }, []);

    // Keyboard hotkeys
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            switch (e.key) {
                case " ":
                case "k":
                    e.preventDefault();
                    togglePlay();
                    break;
                case "ArrowLeft":
                    e.preventDefault();
                    skipTime(-10);
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    skipTime(10);
                    break;
                case "ArrowUp":
                    if (nextEpisodeSlug) { 
                        e.preventDefault(); 
                        router.push(`/xem-phim/${movieSlug}/${nextEpisodeSlug}${serverIndex !== undefined ? `?sv=${serverIndex}` : ''}`); 
                    }
                    break;
                case "ArrowDown":
                    if (prevEpisodeSlug) {
                        e.preventDefault();
                        router.push(`/xem-phim/${movieSlug}/${prevEpisodeSlug}${serverIndex !== undefined ? `?sv=${serverIndex}` : ''}`);
                    }
                    break;
                case "m":
                    e.preventDefault();
                    if (playerRef.current) playerRef.current.muted = !playerRef.current.muted;
                    break;
                case "f":
                    e.preventDefault();
                    if (playerRef.current) playerRef.current.fullscreen.toggle();
                    break;
                case "j":
                    e.preventDefault();
                    skipTime(-10);
                    break;
                case "l":
                    e.preventDefault();
                    skipTime(10);
                    break;
                default:
                    if (/^[0-9]$/.test(e.key) && playerRef.current) {
                        e.preventDefault();
                        const dur = playerRef.current.duration;
                        if (dur && !isNaN(dur)) {
                            playerRef.current.currentTime = (parseInt(e.key) / 10) * dur;
                        }
                    }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [skipTime, nextEpisodeSlug, prevEpisodeSlug, movieSlug, serverIndex, router, togglePlay]);

    return (
        <div className="relative">
            {/* 16:9 video container */}
            <div className="group relative aspect-video overflow-hidden rounded-[var(--radius-lg)] border border-white/8 bg-black shadow-[var(--shadow-lg)]">

                {/* Loading spinner — shown during Plyr mode or while checking sources */}
                <AnimatePresence>
                    {(isCheckingSources || (!useEmbed && isLoading)) && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-20 flex items-center justify-center bg-black/92 backdrop-blur-sm"
                        >
                            <div className="relative flex flex-col items-center gap-4">
                                <div className="relative">
                                    <div className="h-12 w-12 rounded-full border-2 border-primary/20" />
                                    <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                </div>
                                {isCheckingSources && (
                                    <p className="animate-pulse text-sm font-medium text-foreground-secondary">Đang chuẩn bị nguồn phát tốt nhất…</p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {useEmbed && currentEmbedUrl ? (
                    /* ── Embed / Dự phòng mode ── */
                    <iframe
                        src={currentEmbedUrl}
                        className="h-full w-full"
                        title={`${movieName} - ${episodeName}`}
                        allowFullScreen
                        allow="autoplay; encrypted-media; picture-in-picture"
                        referrerPolicy="no-referrer-when-downgrade"
                    />
                ) : !useEmbed && currentM3u8Url ? (
                    /* ── Plyr + HLS mode ── */
                    <div className="w-full h-full">
                        <PlyrPlayer
                            key={`${movieSlug}-${episode}-${currentM3u8Url}`}
                            hlsUrl={currentM3u8Url}
                            source={{ type: 'video', sources: [{ src: currentM3u8Url, type: 'application/x-mpegURL' }] }}
                            onReady={handlePlayerReady}
                            startTime={initialTime}
                            options={{ quality: { default: 720, options: [1080, 720, 480, 360, 240] } }}
                        />
                    </div>
                ) : !isCheckingSources ? (
                    /* ── No source available ── */
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background-secondary">
                        <div className="text-center space-y-2">
                            <p className="font-medium text-foreground">Nguồn phát không khả dụng</p>
                            <p className="text-xs text-foreground-muted">Vui lòng chọn máy chủ khác hoặc thử một tập khác.</p>
                        </div>
                    </div>
                ) : null}

                {/* Next episode button — hiển thị khi hover, ẩn khi đang load */}
                {!isCheckingSources && nextEpisodeSlug && (
                    <div className={`absolute ${useEmbed ? 'bottom-4' : 'bottom-16'} right-4 z-30 opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:hidden xl:block`}>
                        <button
                            onClick={() => router.push(`/xem-phim/${movieSlug}/${nextEpisodeSlug}${serverIndex !== undefined ? `?sv=${serverIndex}` : ''}`)}
                            type="button"
                            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-black/75 px-4 py-2 text-sm font-semibold text-white shadow-xl backdrop-blur-sm transition-colors hover:border-white/35 hover:bg-black/90"
                        >
                            Tập tiếp theo
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <button
                    type="button"
                    disabled={!prevEpisodeSlug}
                    onClick={() => prevEpisodeSlug && router.push(`/xem-phim/${movieSlug}/${prevEpisodeSlug}${serverIndex !== undefined ? `?sv=${serverIndex}` : ''}`)}
                    className="button-ghost disabled:opacity-35"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Tập trước
                </button>
                <button
                    type="button"
                    disabled={!nextEpisodeSlug}
                    onClick={() => nextEpisodeSlug && router.push(`/xem-phim/${movieSlug}/${nextEpisodeSlug}${serverIndex !== undefined ? `?sv=${serverIndex}` : ''}`)}
                    className="button-secondary disabled:opacity-35"
                >
                    Tập tiếp theo
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            {/* Controls bar — Redundancy options */}
            <div className="surface-panel mt-5 flex flex-wrap items-center gap-2 p-4">
                <span className="mb-1 flex w-full items-center gap-2 text-xs font-semibold text-foreground-secondary sm:mb-0 sm:mr-auto sm:w-auto md:mb-1 md:mr-0 md:w-full lg:mb-0 lg:mr-auto lg:w-auto">
                    <Server className="h-4 w-4 text-primary" />
                    Đổi máy chủ phát
                </span>
                
                {m3u8Url && (
                    <button
                        type="button"
                        onClick={() => switchToM3u8(m3u8Url, "op-m3u8")}
                        className={`flex min-h-9 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors md:min-h-11 xl:min-h-9 ${activeSource === "op-m3u8" ? "border-primary bg-primary/12 text-primary" : "border-border bg-background text-foreground-muted hover:border-border-strong hover:text-white"}`}
                        aria-pressed={activeSource === "op-m3u8"}
                        title="OPhim M3U8"
                    >
                        <span className={`w-2 h-2 rounded-full ${availability['op-m3u8'] === false ? 'bg-red-500' : 'bg-green-500'}`} />
                        Máy chủ chính
                    </button>
                )}

                {embedUrl && (
                    <button
                        type="button"
                        onClick={() => switchToEmbed(embedUrl, "op-embed")}
                        className={`flex min-h-9 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors md:min-h-11 xl:min-h-9 ${activeSource === "op-embed" ? "border-primary bg-primary/12 text-primary" : "border-border bg-background text-foreground-muted hover:border-border-strong hover:text-white"}`}
                        aria-pressed={activeSource === "op-embed"}
                        title="OPhim Embed"
                    >
                        <span className={`w-2 h-2 rounded-full ${availability['op-embed'] === false ? 'bg-red-500' : 'bg-green-500'}`} />
                        Chính dự phòng
                    </button>
                )}

                {ncM3u8 && (
                    <button
                        type="button"
                        onClick={() => switchToM3u8(ncM3u8, "nc-m3u8")}
                        className={`flex min-h-9 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors md:min-h-11 xl:min-h-9 ${activeSource === "nc-m3u8" ? "border-primary bg-primary/12 text-primary" : "border-border bg-background text-foreground-muted hover:border-border-strong hover:text-white"}`}
                        aria-pressed={activeSource === "nc-m3u8"}
                        title="NguonC M3U8"
                    >
                        <span className={`w-2 h-2 rounded-full ${availability['nc-m3u8'] === false ? 'bg-red-500' : 'bg-green-500'}`} />
                        Máy chủ 2
                    </button>
                )}

                {ncEmbed && (
                    <button
                        type="button"
                        onClick={() => switchToEmbed(ncEmbed, "nc-embed")}
                        className={`flex min-h-9 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors md:min-h-11 xl:min-h-9 ${activeSource === "nc-embed" ? "border-primary bg-primary/12 text-primary" : "border-border bg-background text-foreground-muted hover:border-border-strong hover:text-white"}`}
                        aria-pressed={activeSource === "nc-embed"}
                        title="NguonC Embed"
                    >
                        <span className={`w-2 h-2 rounded-full ${availability['nc-embed'] === false ? 'bg-red-500' : 'bg-green-500'}`} />
                        Máy chủ 2 dự phòng
                    </button>
                )}

                {paM3u8 && (
                    <button
                        type="button"
                        onClick={() => switchToM3u8(paM3u8, "pa-m3u8")}
                        className={`flex min-h-9 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors md:min-h-11 xl:min-h-9 ${activeSource === "pa-m3u8" ? "border-primary bg-primary/12 text-primary" : "border-border bg-background text-foreground-muted hover:border-border-strong hover:text-white"}`}
                        aria-pressed={activeSource === "pa-m3u8"}
                        title="PhimApi M3U8"
                    >
                        <span className={`w-2 h-2 rounded-full ${availability['pa-m3u8'] === false ? 'bg-red-500' : 'bg-green-500'}`} />
                        Máy chủ 3
                    </button>
                )}

                {paEmbed && (
                    <button
                        type="button"
                        onClick={() => switchToEmbed(paEmbed, "pa-embed")}
                        className={`flex min-h-9 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors md:min-h-11 xl:min-h-9 ${activeSource === "pa-embed" ? "border-primary bg-primary/12 text-primary" : "border-border bg-background text-foreground-muted hover:border-border-strong hover:text-white"}`}
                        aria-pressed={activeSource === "pa-embed"}
                        title="PhimApi Embed"
                    >
                        <span className={`w-2 h-2 rounded-full ${availability['pa-embed'] === false ? 'bg-red-500' : 'bg-green-500'}`} />
                        Máy chủ 3 dự phòng
                    </button>
                )}
            </div>

        </div>
    );
}
