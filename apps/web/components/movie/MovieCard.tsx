"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Clock, Heart, Play } from "lucide-react";
import { useState } from "react";
import { resolveOPhimImageUrl } from "@/lib/api/ophim";
import { useAccountDataStore } from "@/lib/store/useAccountDataStore";
import { toggleFavorite } from "@/app/yeu-thich/actions";
import type { Movie } from "@/types/movie";

interface MovieCardProps {
    movie: Movie;
    index?: number;
    showProgress?: boolean;
}

export default function MovieCard({ movie, index = 0, showProgress = true }: MovieCardProps) {
    const { favoriteSlugs, toggleFavoriteSlug, watchProgress } = useAccountDataStore();
    const shouldReduceMotion = useReducedMotion();
    const isLiked = favoriteSlugs.includes(movie.slug);
    const progress = showProgress ? watchProgress[movie.slug] : null;
    const [imgSrc, setImgSrc] = useState(() => resolveOPhimImageUrl(movie.thumb_url || movie.poster_url));

    const progressPercent = progress
        ? Math.round((progress.currentTime / progress.duration) * 100)
        : 0;

    const handleFavoriteClick = async (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        toggleFavoriteSlug(movie.slug);

        const result = await toggleFavorite({
            movie_slug: movie.slug,
            movie_title: movie.name,
            poster_url: movie.thumb_url,
        });

        if (result && "error" in result) {
            console.error("Lỗi khi lưu phim yêu thích:", result.error);
            toggleFavoriteSlug(movie.slug);
        }
    };

    return (
        <motion.article
            initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(index, 6) * 0.035 }}
            className="group relative min-w-0"
        >
            <div className="relative">
                <Link
                    href={`/phim/${movie.slug}`}
                    prefetch={false}
                    className="block overflow-hidden rounded-[var(--radius-lg)] bg-background-secondary shadow-[var(--shadow-sm)] ring-1 ring-white/6 transition-[transform,box-shadow,ring-color] duration-300 ease-out hover:-translate-y-1 hover:shadow-[var(--shadow-md)] hover:ring-white/14"
                    aria-label={`Xem chi tiết ${movie.name}`}
                >
                    <div className="relative aspect-[2/3] overflow-hidden">
                        <Image
                            src={imgSrc}
                            alt={movie.name}
                            fill
                            loading="lazy"
                            sizes="(max-width: 480px) 46vw, (max-width: 767px) 31vw, (max-width: 1023px) 30vw, (max-width: 1279px) 22vw, 16vw"
                            onError={() => {
                                if (imgSrc !== "/placeholder.jpg") {
                                    setImgSrc("/placeholder.jpg");
                                }
                            }}
                            className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.035]"
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/10 opacity-45 transition-opacity duration-300 group-hover:opacity-70" />

                        {movie.quality && (
                            <span className="absolute left-2.5 top-2.5 rounded-md bg-primary px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[var(--primary-text)] shadow-lg">
                                {movie.quality}
                            </span>
                        )}

                        {movie.episode_current && (
                            <span className="absolute bottom-2.5 right-2.5 max-w-[80%] truncate rounded-md border border-white/10 bg-black/72 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                                {movie.episode_current}
                            </span>
                        )}

                        <span className="absolute inset-0 hidden items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 xl:flex">
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-xl transition-transform duration-200 group-hover:scale-100">
                                <Play className="ml-0.5 h-5 w-5 fill-current" />
                            </span>
                        </span>

                        {progress && progressPercent > 0 && (
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20" aria-label={`Đã xem ${progressPercent}%`}>
                                <div
                                    className="h-full bg-primary transition-[width] duration-300"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        )}
                    </div>
                </Link>

                <button
                    type="button"
                    onClick={handleFavoriteClick}
                    className={`absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full border text-white shadow-lg backdrop-blur-md transition-colors md:h-11 md:w-11 xl:h-8 xl:w-8 ${
                        isLiked
                            ? "border-primary bg-primary"
                            : "border-white/12 bg-black/55 hover:border-white/25 hover:bg-black/75 xl:opacity-0 xl:group-hover:opacity-100 xl:group-focus-within:opacity-100"
                    } ${movie.quality ? "top-11" : ""}`}
                    aria-label={isLiked ? `Bỏ ${movie.name} khỏi yêu thích` : `Thêm ${movie.name} vào yêu thích`}
                    aria-pressed={isLiked}
                >
                    <Heart className={`h-4 w-4 md:h-5 md:w-5 xl:h-4 xl:w-4 ${isLiked ? "fill-current" : ""}`} />
                </button>
            </div>

            <div className="px-0.5 pt-3">
                <Link
                    href={`/phim/${movie.slug}`}
                    prefetch={false}
                    className="line-clamp-1 text-sm font-semibold leading-5 text-foreground transition-colors hover:text-primary sm:text-[0.94rem] md:text-base xl:text-[0.94rem]"
                >
                    {movie.name}
                </Link>
                <div className="mt-1.5 flex min-h-4 items-center gap-2 text-xs text-foreground-muted md:text-[0.8rem] xl:text-xs">
                    {movie.year > 0 && <span>{movie.year}</span>}
                    {movie.year > 0 && movie.lang && <span aria-hidden="true">·</span>}
                    {movie.lang && <span className="line-clamp-1">{movie.lang}</span>}
                </div>
                {progress && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-foreground-secondary">
                        <Clock className="h-3 w-3 flex-none text-primary" />
                        <span className="line-clamp-1">
                            Tiếp tục {progress.episodeName || `Tập ${progress.episode}`}
                        </span>
                    </div>
                )}
            </div>
        </motion.article>
    );
}
