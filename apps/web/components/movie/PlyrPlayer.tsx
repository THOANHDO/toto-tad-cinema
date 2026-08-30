"use client";

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Hls from "hls.js";
import { isFatalHlsError, isFatalVideoError, classifyHlsError } from "@/lib/player/playback-errors";
import { VideoHealthWatchdog, checkVideoHealth } from "@/lib/player/video-health";

declare global {
  interface Window {
    Plyr: any;
  }
}

interface PlyrPlayerProps {
  options?: any;
  source?: any;
  hlsUrl?: string;
  sourceId?: string;
  attemptId: number;
  onReady?: (player: any) => void;
  onError?: (reason: string, attemptId: number) => void;
  onPlaying?: (attemptId: number) => void;
  onVideoHealthy?: (attemptId: number) => void;
  onWaiting?: () => void;
  startTime?: number;
}

export type PlyrPlayerHandle = {
  getInternalPlayer: () => any;
  toggleFullscreen: () => void;
};

function isAppleDevice() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
    Boolean((navigator as any).standalone)
  );
}

export const PlyrPlayer = forwardRef<PlyrPlayerHandle, PlyrPlayerProps>((props, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const hlsRef = useRef<Hls | null>(null);
  const watchdogRef = useRef<VideoHealthWatchdog>(new VideoHealthWatchdog());
  const hasLoggedPlayingRef = useRef(false);
  const hasReportedHealthyRef = useRef(false);
  const fragErrorCountRef = useRef(0);
  const baselineFramesRef = useRef(0);

  const { options, source, hlsUrl, sourceId = "hls", attemptId, onReady, onError, onPlaying, onVideoHealthy, onWaiting, startTime } = props;

  useImperativeHandle(ref, () => ({
    getInternalPlayer: () => playerRef.current,
    toggleFullscreen: () => {
      const video = videoRef.current;
      if (video && typeof (video as any).webkitEnterFullscreen === "function" && isAppleDevice()) {
        (video as any).webkitEnterFullscreen();
      } else if (playerRef.current?.fullscreen) {
        playerRef.current.fullscreen.toggle();
      }
    },
  }));

  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    hasLoggedPlayingRef.current = false;
    hasReportedHealthyRef.current = false;
    fragErrorCountRef.current = 0;

    // Capture baseline frame count for current attempt
    if (typeof (video as any).getVideoPlaybackQuality === "function") {
      try {
        baselineFramesRef.current = (video as any).getVideoPlaybackQuality()?.totalVideoFrames || 0;
      } catch (_e) {
        baselineFramesRef.current = 0;
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[HLS Renderer] Mount source: ${sourceId} (attempt: ${attemptId})`);
    }

    const defaultOptions = {
      fullscreen: {
        enabled: true,
        fallback: true,
        iosNative: "always",
      },
      controls: [
        "play-large",
        "play",
        "progress",
        "current-time",
        "mute",
        "volume",
        "captions",
        "settings",
        "airplay",
        "pip",
        "rewind",
        "fast-forward",
        "fullscreen",
      ],
      settings: ["quality", "speed"],
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 4] },
      quality: { default: 1080, options: [4320, 2880, 2160, 1440, 1080, 720, 576, 480, 360, 240] },
      ...options,
    };

    const cleanup = () => {
      watchdogRef.current.stop();
      if (video) {
        try {
          video.muted = true;
          video.pause();
          video.removeAttribute("src");
          video.load();
        } catch (_e) {}
      }
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (_e) {}
        playerRef.current = null;
      }
      if (hlsRef.current) {
        try {
          hlsRef.current.stopLoad();
          hlsRef.current.detachMedia();
          hlsRef.current.destroy();
        } catch (_e) {}
        hlsRef.current = null;
      }
    };

    const handleNativeVideoError = () => {
      if (isFatalVideoError(video.error)) {
        cleanup();
        onError?.(`native_video_code_${video.error?.code || "unknown"}`, attemptId);
      }
    };

    const verifyVideoHealth = () => {
      if (hasReportedHealthyRef.current) return;
      const health = checkVideoHealth(video, baselineFramesRef.current);
      if (health.isHealthy) {
        hasReportedHealthyRef.current = true;
        watchdogRef.current.stop();
        onVideoHealthy?.(attemptId);
      }
    };

    const handlePlaying = () => {
      if (!hasLoggedPlayingRef.current) {
        hasLoggedPlayingRef.current = true;
        onPlaying?.(attemptId);
      }

      verifyVideoHealth();

      if (!hasReportedHealthyRef.current) {
        // Start Video Health Watchdog (8s timeout)
        watchdogRef.current.start(
          video,
          String(attemptId),
          (reason) => {
            cleanup();
            onError?.(reason, attemptId);
          },
          8000
        );
      }
    };

    const handleResize = () => {
      verifyVideoHealth();
    };

    const handleTimeUpdate = () => {
      verifyVideoHealth();
    };

    const handleLoadedData = () => {
      verifyVideoHealth();
    };

    const handleCanPlay = () => {
      verifyVideoHealth();
    };

    const handleWaiting = () => onWaiting?.();

    const handleWebkitBeginFullscreen = () => {
      if (playerRef.current && !playerRef.current.fullscreen?.active) {
        try {
          playerRef.current.fullscreen?.enter();
        } catch (_e) {}
      }
    };

    const handleWebkitEndFullscreen = () => {
      if (playerRef.current && playerRef.current.fullscreen?.active) {
        try {
          playerRef.current.fullscreen?.exit();
        } catch (_e) {}
      }
    };

    video.addEventListener("error", handleNativeVideoError);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("resize", handleResize);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("webkitbeginfullscreen", handleWebkitBeginFullscreen);
    video.addEventListener("webkitendfullscreen", handleWebkitEndFullscreen);

    const initPlayer = (Constructor: any) => {
      if (!Constructor || !video) return;
      cleanup();

      try {
        const player = new Constructor(video, defaultOptions);
        playerRef.current = player;

        const isApple = isAppleDevice();
        const canPlayNativeHls = video.canPlayType("application/vnd.apple.mpegurl");

        // Hook fullscreen button click directly on Apple devices
        if (isApple) {
          const container = player.elements?.container;
          if (container) {
            const fsBtn = container.querySelector('[data-plyr="fullscreen"]');
            if (fsBtn) {
              fsBtn.addEventListener(
                "click",
                (e: Event) => {
                  if (video && typeof (video as any).webkitEnterFullscreen === "function") {
                    e.preventDefault();
                    e.stopPropagation();
                    (video as any).webkitEnterFullscreen();
                  }
                },
                { capture: true }
              );
            }
          }
        }

        if (hlsUrl && isApple && canPlayNativeHls) {
          // Native Safari HLS on iOS, iPadOS, Safari
          video.src = hlsUrl;
          video.addEventListener(
            "loadedmetadata",
            () => {
              onReady?.(player);
              if (startTime && startTime > 0) video.currentTime = startTime;
              player.play().catch(() => {});
            },
            { once: true }
          );
        } else if (hlsUrl && Hls.isSupported()) {
          const hls = new Hls({
            ...(startTime && startTime > 0 ? { startPosition: startTime } : {}),
            manifestLoadingMaxRetry: 2,
            levelLoadingMaxRetry: 2,
            fragLoadingMaxRetry: 3,
          });
          hlsRef.current = hls;
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
            if (data && data.levels && data.levels.length > 0) {
              const firstLevel = data.levels[0];
              if (firstLevel.videoCodec === undefined && firstLevel.width === 0) {
                cleanup();
                onError?.("audio_only_manifest", attemptId);
                return;
              }
            }

            onReady?.(player);
            player.play().catch(() => {});
          });

          hls.on(Hls.Events.ERROR, (_, data) => {
            const detailsStr = String(data.details || "");
            if (detailsStr === "fragLoadError" || detailsStr === "fragLoadTimeout") {
              fragErrorCountRef.current += 1;
              if (fragErrorCountRef.current >= 3) {
                cleanup();
                onError?.(classifyHlsError(data), attemptId);
                return;
              }
            }

            if (isFatalHlsError(data)) {
              cleanup();
              onError?.(classifyHlsError(data), attemptId);
            }
          });
        } else if (hlsUrl && canPlayNativeHls) {
          video.src = hlsUrl;
          video.addEventListener(
            "loadedmetadata",
            () => {
              onReady?.(player);
              if (startTime && startTime > 0) video.currentTime = startTime;
              player.play().catch(() => {});
            },
            { once: true }
          );
        } else {
          if (source) player.source = source;
          onReady?.(player);
        }
      } catch (e) {
        console.error("Failed to init Plyr:", e);
        onError?.("init_player_exception", attemptId);
      }
    };

    const loadAndInit = () => {
      if (window.Plyr) {
        initPlayer(window.Plyr);
        return;
      }

      const scriptId = "plyr-cdn-script";
      let script = document.getElementById(scriptId) as HTMLScriptElement;

      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://cdn.plyr.io/3.7.8/plyr.js";
        script.async = true;
        document.head.appendChild(script);
      }

      const onScriptLoad = () => {
        if (window.Plyr) initPlayer(window.Plyr);
      };

      script.addEventListener("load", onScriptLoad);
      return () => script.removeEventListener("load", onScriptLoad);
    };

    const cleanupEventListener = loadAndInit();

    return () => {
      video.removeEventListener("error", handleNativeVideoError);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("resize", handleResize);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("webkitbeginfullscreen", handleWebkitBeginFullscreen);
      video.removeEventListener("webkitendfullscreen", handleWebkitEndFullscreen);
      cleanup();
      if (cleanupEventListener) cleanupEventListener();
    };
  }, [hlsUrl, sourceId, attemptId, JSON.stringify(source)]);

  return (
    <div className="plyr-container group relative z-10 flex h-full min-h-[180px] w-full items-center justify-center overflow-hidden bg-black sm:min-h-[240px]">
      <video
        ref={videoRef}
        className="plyr-react block h-full w-full object-contain"
        playsInline
        {...{ "webkit-playsinline": "true" }}
      />
    </div>
  );
});

PlyrPlayer.displayName = "PlyrPlayer";

export default PlyrPlayer;
