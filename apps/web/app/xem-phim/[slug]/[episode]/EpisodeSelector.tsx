"use client";

import { useState } from "react";
import Link from "next/link";
import type { Episode } from "@/types/movie";
import { Server } from "lucide-react";

interface EpisodeSelectorProps {
    episodes: Episode[];
    movieSlug: string;
    currentEpisode: string;
    initialServerIndex?: number;
}

export default function EpisodeSelector({
    episodes,
    movieSlug,
    currentEpisode,
    initialServerIndex = 0,
}: EpisodeSelectorProps) {
    const [activeServer, setActiveServer] = useState(initialServerIndex);

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
            <div className="grid grid-cols-4 gap-2 min-[460px]:grid-cols-5 sm:grid-cols-7 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-16">
                {currentServer?.server_data?.map((ep: { slug: string; name: string }) => {
                    const isCurrent = ep.slug === currentEpisode;
                    
                    if (isCurrent) {
                        return (
                            <div
                                key={ep.slug}
                                className="flex min-h-11 cursor-default items-center justify-center rounded-lg border border-primary bg-primary px-3 py-2 text-center text-sm font-semibold text-[var(--primary-text)]"
                            >
                                {ep.name}
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={ep.slug}
                            href={`/xem-phim/${movieSlug}/${ep.slug}?sv=${activeServer}`}
                            prefetch={false}
                            className="flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-center text-sm font-medium text-foreground-secondary transition-colors hover:border-border-strong hover:bg-background-tertiary hover:text-white"
                        >
                            {ep.name}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
