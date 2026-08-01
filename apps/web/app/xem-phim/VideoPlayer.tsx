"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
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

    // Check link availability and auto-select best source
    useEffect(() => {
        setIsCheckingSources(true);
        // Reset state for new episode
        setAvailability({});
        setActiveSource(null);
        setCurrentM3u8Url(null);
        setCurrentEmbedUrl(null);

        const checkLink = async (url: string, key: string): Promise<boolean> => {
            if (!url) return false;
            try {
                // If it's a m3u8 link from kkphimplayer, it might have restrictive CORS
                await fetch(url, { method: 'HEAD', mode: 'no-cors' });
                return true;
            } catch {
                return false;
            }
        };

        const verifySources = async () => {
            // Check all sources in parallel to be fast, but we'll prioritize the results
            const checks = [
                { key: 'op-m3u8', url: m3u8Url, type: 'm3u8' },
                { key: 'nc-m3u8', url: ncM3u8, type: 'm3u8' },
                { key: 'pa-m3u8', url: paM3u8, type: 'm3u8' },
                { key: 'op-embed', url: embedUrl, type: 'embed' },
                { key: 'nc-embed', url: ncEmbed, type: 'embed' },
                { key: 'pa-embed', url: paEmbed, type: 'embed' }
            ];

            const results: Record<string, boolean> = {};
            
            await Promise.all(checks.map(async (check) => {
                const isAvailable = await checkLink(check.url, check.key);
                results[check.key] = isAvailable;
            }));

            setAvailability(results);
            
            // Auto-select the highest priority available source
            // Priority: OP-M3U8 > NC-M3U8 > PA-M3U8 > OP-EMBED > NC-EMBED > PA-EMBED
            let selected = null;
            for (const check of checks) {
                if (results[check.key] && check.url) {
                    selected = check;
                    break;
                }
            }

            if (selected) {
                setActiveSource(selected.key as any);
                if (selected.type === 'm3u8') {
                    setCurrentM3u8Url(selected.url);
                    setUseEmbed(false);
                } else {
                    setCurrentEmbedUrl(selected.url);
                    setUseEmbed(true);
                }
            } else {
                // Fallback completely if all checks fail but we have URLs (could be cors issues hiding real status)
                if (m3u8Url) {
                    setActiveSource("op-m3u8");
                    setCurrentM3u8Url(m3u8Url);
                    setUseEmbed(false);
                } else if (embedUrl) {
                    setActiveSource("op-embed");
                    setCurrentEmbedUrl(embedUrl);
                    setUseEmbed(true);
                }
            }

            setIsCheckingSources(false);
        };

        verifySources();
    }, [embedUrl, m3u8Url, ncEmbed, ncM3u8, paEmbed, paM3u8, episode]);

    // Save progress every 10 seconds while playing
    useEffect(() => {
        const saveInterval = setInterval(async () => {
            if (playerRef.current && !playerRef.current.paused) {
                const currentTime = Math.floor(playerRef.current.currentTime || 0);
                const duration = Math.floor(playerRef.current.duration || 0);

                if (duration > 0 && currentTime > 0) {
                    updateWatchProgress(movieSlug, { episode, episodeName, currentTime, duration, updatedAt: Date.now() });

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
                    } catch (err) {
                        console.error('Failed to sync history:', err);
                    }
                }
            }
        }, 10000);

        return () => clearInterval(saveInterval);
    }, [movieSlug, movieName, episode, episodeName, movieThumb, updateWatchProgress]);

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
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden group shadow-2xl border border-white/5">

                {/* Loading spinner — shown during Plyr mode or while checking sources */}
                <AnimatePresence>
                    {(isCheckingSources || (!useEmbed && isLoading)) && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-20 flex items-center justify-center bg-black backdrop-blur-sm"
                        >
                            <div className="relative flex flex-col items-center gap-4">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
                                    <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(225,29,72,0.4)]" />
                                </div>
                                {isCheckingSources && (
                                    <p className="text-primary text-sm font-medium tracking-wide animate-pulse">Đang tìm nguồn phát tốt nhất...</p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {useEmbed && currentEmbedUrl ? (
                    /* ── Embed / Dự phòng mode ── */
                    <iframe
                        src={currentEmbedUrl}
                        className="w-full h-full"
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
                    <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 z-10">
                        <div className="text-center space-y-2">
                            <p className="text-foreground-secondary font-medium">Nguồn phát không khả dụng</p>
                            <p className="text-xs text-foreground-muted">Vui lòng thử lại sau hoặc chọn tập khác</p>
                        </div>
                    </div>
                ) : null}

                {/* Next episode button — hiển thị khi hover, ẩn khi đang load */}
                {!isCheckingSources && nextEpisodeSlug && (
                    <div className={`absolute ${useEmbed ? 'bottom-4' : 'bottom-16'} right-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
                        <button
                            onClick={() => router.push(`/xem-phim/${movieSlug}/${nextEpisodeSlug}${serverIndex !== undefined ? `?sv=${serverIndex}` : ''}`)}
                            className="flex items-center gap-1.5 bg-black/70 hover:bg-black/90 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2 rounded-xl border border-white/20 hover:border-white/40 transition-all shadow-xl"
                        >
                            Tập tiếp theo
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Controls bar — Redundancy options */}
            <div className="mt-6 flex flex-wrap items-center justify-end p-4 bg-neutral-900/50 backdrop-blur-xl rounded-2xl border border-white/5 shadow-xl gap-3">
                <span className="text-[10px] font-black tracking-widest text-foreground-muted mr-auto px-2 uppercase">Nguồn phát dự phòng</span>
                
                {m3u8Url && (
                    <button
                        onClick={() => switchToM3u8(m3u8Url, "op-m3u8")}
                        className={`px-4 py-2 border rounded-xl text-xs font-black tracking-widest transition-all flex items-center gap-2 ${activeSource === "op-m3u8" ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/10 text-foreground-muted hover:bg-white/10"}`}
                    >
                        <span className={`w-2 h-2 rounded-full ${availability['op-m3u8'] === false ? 'bg-red-500' : 'bg-green-500'}`} />
                        OP-M3U8
                    </button>
                )}

                {embedUrl && (
                    <button
                        onClick={() => switchToEmbed(embedUrl, "op-embed")}
                        className={`px-4 py-2 border rounded-xl text-xs font-black tracking-widest transition-all flex items-center gap-2 ${activeSource === "op-embed" ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/10 text-foreground-muted hover:bg-white/10"}`}
                    >
                        <span className={`w-2 h-2 rounded-full ${availability['op-embed'] === false ? 'bg-red-500' : 'bg-green-500'}`} />
                        OP-EMBED
                    </button>
                )}

                {ncM3u8 && (
                    <button
                        onClick={() => switchToM3u8(ncM3u8, "nc-m3u8")}
                        className={`px-4 py-2 border rounded-xl text-xs font-black tracking-widest transition-all flex items-center gap-2 ${activeSource === "nc-m3u8" ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/10 text-foreground-muted hover:bg-white/10"}`}
                    >
                        <span className={`w-2 h-2 rounded-full ${availability['nc-m3u8'] === false ? 'bg-red-500' : 'bg-green-500'}`} />
                        NC-M3U8
                    </button>
                )}

                {ncEmbed && (
                    <button
                        onClick={() => switchToEmbed(ncEmbed, "nc-embed")}
                        className={`px-4 py-2 border rounded-xl text-xs font-black tracking-widest transition-all flex items-center gap-2 ${activeSource === "nc-embed" ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/10 text-foreground-muted hover:bg-white/10"}`}
                    >
                        <span className={`w-2 h-2 rounded-full ${availability['nc-embed'] === false ? 'bg-red-500' : 'bg-green-500'}`} />
                        NC-EMBED
                    </button>
                )}

                {paM3u8 && (
                    <button
                        onClick={() => switchToM3u8(paM3u8, "pa-m3u8")}
                        className={`px-4 py-2 border rounded-xl text-xs font-black tracking-widest transition-all flex items-center gap-2 ${activeSource === "pa-m3u8" ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/10 text-foreground-muted hover:bg-white/10"}`}
                    >
                        <span className={`w-2 h-2 rounded-full ${availability['pa-m3u8'] === false ? 'bg-red-500' : 'bg-green-500'}`} />
                        PA-M3U8
                    </button>
                )}

                {paEmbed && (
                    <button
                        onClick={() => switchToEmbed(paEmbed, "pa-embed")}
                        className={`px-4 py-2 border rounded-xl text-xs font-black tracking-widest transition-all flex items-center gap-2 ${activeSource === "pa-embed" ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/10 text-foreground-muted hover:bg-white/10"}`}
                    >
                        <span className={`w-2 h-2 rounded-full ${availability['pa-embed'] === false ? 'bg-red-500' : 'bg-green-500'}`} />
                        PA-EMBED
                    </button>
                )}
            </div>

        </div>
    );
}
