"use client";

import { useState } from "react";
import Link from "next/link";
import { Server } from "lucide-react";
import type { Episode } from "@/types/movie";
import { useStore } from "@/lib/store/useStore";

interface EpisodeListProps {
    episodes: Episode[];
    movieSlug: string;
}

export default function EpisodeList({ episodes, movieSlug }: EpisodeListProps) {
    const [activeServer, setActiveServer] = useState(0);
    const { getProgress } = useStore();
    const progress = getProgress(movieSlug);

    if (!episodes || episodes.length === 0) return null;

    const currentServer = episodes[activeServer];

    return (
        <div className="space-y-5">
            {/* Server tabs */}
            {episodes.length > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                        <Server className="h-4 w-4" />
                        Máy chủ
                    </span>
                    {episodes.map((server, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => setActiveServer(index)}
                            className={`min-h-10 rounded-lg border px-4 py-2 text-sm font-medium transition-colors md:min-h-11 xl:min-h-10 ${activeServer === index
                                    ? "border-primary bg-primary text-[var(--primary-text)]"
                                    : "border-border bg-background text-foreground-secondary hover:border-border-strong hover:text-white"
                                }`}
                            aria-pressed={activeServer === index}
                        >
                            {server.server_name}
                        </button>
                    ))}
                </div>
            )}

            {/* Episode grid */}
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-12">
                {currentServer?.server_data?.map((ep) => {
                    const isWatching = progress?.episode === ep.slug;
                    return (
                        <Link
                            key={ep.slug}
                            href={`/xem-phim/${movieSlug}/${ep.slug}?sv=${activeServer}`}
                            prefetch={false}
                            className={`relative flex min-h-11 items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors ${isWatching
                                    ? "border-primary bg-primary text-[var(--primary-text)] ring-2 ring-primary/30 ring-offset-2 ring-offset-background-secondary"
                                    : "border-border bg-background text-foreground-secondary hover:border-border-strong hover:bg-background-tertiary hover:text-white"
                                }`}
                        >
                            {ep.name}
                            {isWatching && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
