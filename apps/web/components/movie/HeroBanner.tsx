"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Info, Play } from "lucide-react";
import { useState } from "react";
import { resolveOPhimImageUrl } from "@/lib/api/ophim";
import type { Movie } from "@/types/movie";

interface HeroBannerProps {
    movie: Movie;
}

export default function HeroBanner({ movie }: HeroBannerProps) {
    const shouldReduceMotion = useReducedMotion();
    const [imgSrc, setImgSrc] = useState(() => resolveOPhimImageUrl(movie.poster_url || movie.thumb_url));

    return (
        <section
            className="relative min-h-[34rem] overflow-hidden sm:min-h-[38rem] md:h-[66svh] md:min-h-[36rem] md:max-h-[44rem] lg:h-[68svh] lg:max-h-[48rem] xl:h-[76vh] xl:min-h-[42rem] xl:max-h-[54rem]"
            aria-label={`Phim nổi bật: ${movie.name}`}
        >
            <div className="absolute inset-0">
                <Image
                    src={imgSrc}
                    alt=""
                    fill
                    priority
                    sizes="100vw"
                    onError={() => setImgSrc("/placeholder.jpg")}
                    className="object-cover object-[62%_center] sm:object-center md:object-[60%_center] lg:object-center"
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,4,6,0.96)_0%,rgba(3,4,6,0.78)_32%,rgba(3,4,6,0.26)_68%,rgba(3,4,6,0.2)_100%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,4,6,0.52)_0%,transparent_30%,transparent_58%,var(--background)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-background to-transparent" />
            </div>

            <div className="site-container relative flex h-full min-h-[34rem] items-end pb-20 pt-28 sm:min-h-[38rem] md:min-h-[36rem] md:pb-20 md:pt-24 lg:items-center lg:pb-16 xl:min-h-[42rem] xl:pb-20 xl:pt-28">
                <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
                    className="max-w-[38rem] md:max-w-[32rem] lg:max-w-[36rem] xl:max-w-[38rem]"
                >
                    <p className="eyebrow mb-4">Nổi bật hôm nay</p>

                    <h1 className="max-w-[14ch] text-4xl font-extrabold leading-[0.98] tracking-[-0.055em] text-white sm:text-5xl md:text-[clamp(2.75rem,5.5vw,4rem)] lg:text-[clamp(3.25rem,4.5vw,4.5rem)] xl:text-7xl">
                        {movie.name}
                    </h1>

                    {movie.origin_name && (
                        <p className="mt-3 line-clamp-1 text-base font-medium text-white/72 sm:text-lg">
                            {movie.origin_name}
                        </p>
                    )}

                    <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/75">
                        {movie.quality && (
                            <span className="rounded-md border border-white/15 bg-white/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                                {movie.quality}
                            </span>
                        )}
                        {movie.year > 0 && <span className="font-semibold text-white">{movie.year}</span>}
                        {movie.lang && <span>{movie.lang}</span>}
                        {movie.time && <span>{movie.time}</span>}
                    </div>

                    {movie.episode_current && (
                        <p className="mt-4 line-clamp-2 max-w-lg text-sm leading-6 text-foreground-secondary sm:text-base">
                            {movie.episode_current}
                        </p>
                    )}

                    {movie.category && movie.category.length > 0 && (
                        <div className="mt-5 hidden flex-wrap items-center gap-2 sm:flex">
                            {movie.category.slice(0, 4).map((category) => (
                                <Link
                                    key={category.slug}
                                    href={`/the-loai/${category.slug}`}
                                    prefetch={false}
                                    className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-white/76 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
                                >
                                    {category.name}
                                </Link>
                            ))}
                        </div>
                    )}

                    <div className="mt-7 flex flex-wrap gap-3">
                        <Link
                            href={`/phim/${movie.slug}`}
                            prefetch={false}
                            className="button-primary min-w-32"
                        >
                            <Play className="h-4 w-4 fill-current" />
                            Xem ngay
                        </Link>
                        <Link
                            href={`/phim/${movie.slug}`}
                            prefetch={false}
                            className="button-secondary min-w-32"
                        >
                            <Info className="h-4 w-4" />
                            Chi tiết
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
