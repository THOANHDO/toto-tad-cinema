"use client";

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Hls from 'hls.js';

declare global {
    interface Window {
        Plyr: any;
    }
}

interface PlyrPlayerProps {
    options?: any;
    source: any;
    hlsUrl?: string;
    onReady?: (player: any) => void;
    startTime?: number;
}

export type PlyrPlayerHandle = {
    getInternalPlayer: () => any;
};

export const PlyrPlayer = forwardRef<PlyrPlayerHandle, PlyrPlayerProps>((props, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<any>(null);
    const hlsRef = useRef<Hls | null>(null);
    const { options, source, hlsUrl, onReady, startTime } = props;

    useImperativeHandle(ref, () => ({
        getInternalPlayer: () => playerRef.current
    }));

    useEffect(() => {
        if (!videoRef.current) return;

        const video = videoRef.current;

        const defaultOptions = {
            controls: [
                'play-large', 'play', 'progress',
                'current-time', 'mute', 'volume',
                'captions', 'settings',
                'airplay', 'pip', 'rewind', 'fast-forward', 'fullscreen'
            ],
            settings: ['quality', 'speed'],
            speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 4] },
            quality: { default: 1080, options: [4320, 2880, 2160, 1440, 1080, 720, 576, 480, 360, 240] },
            ...options
        };

        const cleanup = () => {
            if (playerRef.current) {
                try {
                    playerRef.current.destroy();
                } catch (e) {
                    console.error('Error destroying player:', e);
                }
                playerRef.current = null;
            }
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
            (window as any).Plyr = undefined;
            document.getElementById('plyr-cdn-script')?.remove();
        };

        const initPlayer = (Constructor: any) => {
            if (!Constructor || !video) return;
            cleanup();

            try {
                const player = new Constructor(video, defaultOptions);
                playerRef.current = player;

                if (hlsUrl && Hls.isSupported()) {
                    const hls = new Hls(startTime && startTime > 0 ? { startPosition: startTime } : {});
                    hlsRef.current = hls;
                    hls.loadSource(hlsUrl);
                    hls.attachMedia(video);
                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        if (onReady) onReady(player);
                        player.play().catch(() => { });
                    });
                } else if (hlsUrl && video.canPlayType('application/vnd.apple.mpegurl')) {
                    video.src = hlsUrl;
                    video.addEventListener('loadedmetadata', () => {
                        if (onReady) onReady(player);
                        if (startTime && startTime > 0) video.currentTime = startTime;
                        player.play().catch(() => { });
                    }, { once: true });
                } else {
                    if (source) player.source = source;
                    onReady && onReady(player);
                }
            } catch (e) {
                console.error('Failed to init Plyr:', e);
            }
        };

        const loadAndInit = () => {
            if (window.Plyr) {
                initPlayer(window.Plyr);
                return;
            }

            const scriptId = 'plyr-cdn-script';
            let script = document.getElementById(scriptId) as HTMLScriptElement;

            if (!script) {
                script = document.createElement('script');
                script.id = scriptId;
                script.src = 'https://cdn.plyr.io/3.7.8/plyr.js';
                script.async = true;
                document.head.appendChild(script);
            }

            const onScriptLoad = () => {
                if (window.Plyr) initPlayer(window.Plyr);
            };

            script.addEventListener('load', onScriptLoad);
            return () => script.removeEventListener('load', onScriptLoad);
        };

        const cleanupEventListener = loadAndInit();

        return () => {
            cleanup();
            if (cleanupEventListener) cleanupEventListener();
        };
    }, [hlsUrl, JSON.stringify(source)]);

    useEffect(() => {
        const handleFullscreen = () => {
            try {
                if (document.fullscreenElement) {
                    // Lock to landscape when entering fullscreen
                    if (window.screen && window.screen.orientation && (window.screen.orientation as any).lock) {
                        (window.screen.orientation as any).lock('landscape').catch(() => {
                            // Silently fail if not supported or denied
                        });
                    }
                } else {
                    // Unlock orientation when exiting fullscreen
                    if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
                        window.screen.orientation.unlock();
                    }
                }
            } catch (err) {
                console.warn('Orientation lock error:', err);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreen);
        document.addEventListener('webkitfullscreenchange', handleFullscreen);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreen);
            document.removeEventListener('webkitfullscreenchange', handleFullscreen);
        };
    }, []);

    return (
        <div className="plyr-container group relative z-10 flex h-full min-h-[180px] w-full items-center justify-center overflow-hidden bg-black sm:min-h-[240px]">
            <video ref={videoRef} className="plyr-react block h-full w-full" crossOrigin="anonymous" playsInline />
        </div>
    );
});

PlyrPlayer.displayName = 'PlyrPlayer';

export default PlyrPlayer;
