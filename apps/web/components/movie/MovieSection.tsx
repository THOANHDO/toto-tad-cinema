"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import MovieGrid from "./MovieGrid";
import type { Movie } from "@/types/movie";

interface MovieSectionProps {
    title: string;
    movies: Movie[];
    href?: string;
    showProgress?: boolean;
}

export default function MovieSection({ title, movies, href, showProgress = true }: MovieSectionProps) {
    return (
        <section className="py-8 md:py-10">
            <div className="mb-5 flex items-end justify-between gap-4 md:mb-6">
                <h2 className="text-xl font-bold tracking-[-0.025em] text-foreground md:text-2xl">{title}</h2>
                {href && (
                    <Link
                        href={href}
                        prefetch={false}
                        className="group flex items-center gap-1 text-sm font-semibold text-foreground-secondary transition-colors hover:text-white"
                    >
                        Xem tất cả
                        <ChevronRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5" />
                    </Link>
                )}
            </div>
            <MovieGrid movies={movies} showProgress={showProgress} />
        </section>
    );
}
