"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import MovieCard from "./MovieCard";
import type { Movie } from "@/types/movie";

interface MovieSliderProps {
    title: string;
    movies: Movie[];
    href?: string;
    showProgress?: boolean;
}

export default function MovieSlider({ title, movies, href, showProgress = true }: MovieSliderProps) {
    const sliderRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: "left" | "right") => {
        if (sliderRef.current) {
            const scrollAmount = sliderRef.current.offsetWidth * 0.82;
            sliderRef.current.scrollBy({
                left: direction === "left" ? -scrollAmount : scrollAmount,
                behavior: "smooth",
            });
        }
    };

    if (!movies || movies.length === 0) return null;

    const showNavButtons = movies.length > 5;

    return (
        <section className="group/section relative py-7 md:py-8 lg:py-9" aria-labelledby={`section-${href ?? title}`}>
            <div className="mb-4 flex items-end justify-between gap-4 md:mb-5">
                <h2
                    id={`section-${href ?? title}`}
                    className="text-xl font-bold tracking-[-0.03em] text-foreground md:text-2xl"
                >
                    {title}
                </h2>
                {href && (
                    <Link
                        href={href}
                        prefetch={false}
                        className="group/link flex flex-none items-center gap-1 text-xs font-semibold text-foreground-secondary transition-colors hover:text-white sm:text-sm"
                    >
                        Xem tất cả
                        <ChevronRight className="h-4 w-4 text-primary transition-transform group-hover/link:translate-x-0.5" />
                    </Link>
                )}
            </div>

            <div className="relative">
                {showNavButtons && (
                    <button
                        type="button"
                        onClick={() => scroll("left")}
                        className="absolute left-2 top-[42%] z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/75 text-white opacity-0 shadow-xl backdrop-blur-md transition-[opacity,background-color,border-color] hover:border-white/20 hover:bg-black/90 group-hover/section:opacity-100 group-focus-within/section:opacity-100 xl:flex"
                        aria-label={`Cuộn ${title} sang trái`}
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                )}

                {showNavButtons && (
                    <button
                        type="button"
                        onClick={() => scroll("right")}
                        className="absolute right-2 top-[42%] z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/75 text-white opacity-0 shadow-xl backdrop-blur-md transition-[opacity,background-color,border-color] hover:border-white/20 hover:bg-black/90 group-hover/section:opacity-100 group-focus-within/section:opacity-100 xl:flex"
                        aria-label={`Cuộn ${title} sang phải`}
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                )}

                <div
                    ref={sliderRef}
                    className="hide-scrollbar -mx-[var(--page-gutter)] flex snap-x snap-mandatory gap-3 overflow-x-auto px-[var(--page-gutter)] pb-3 scroll-px-[var(--page-gutter)] sm:gap-4 md:mx-0 md:px-0 md:scroll-px-0 lg:gap-4 xl:gap-5 xl:snap-proximity"
                >
                    {movies.map((movie, index) => (
                        <div
                            key={movie._id || movie.slug}
                            className="w-[42vw] max-w-[12.25rem] flex-none snap-start min-[520px]:w-[30vw] sm:w-[27vw] md:w-[29vw] md:max-w-none lg:w-[22vw] xl:w-[calc((100%-6.25rem)/6)]"
                        >
                            <MovieCard movie={movie} index={index} showProgress={showProgress} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
