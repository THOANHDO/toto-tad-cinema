"use client";

import { useRef } from "react";
import Link from "next/link";
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    Film,
    Globe2,
    Star,
    Tag,
    Users2,
} from "lucide-react";
import type { MovieDetail, Person } from "@/types/movie";

interface MovieInfoDetailsProps {
    movie: MovieDetail;
    peoples?: Person[];
}

export default function MovieInfoDetails({ movie, peoples = [] }: MovieInfoDetailsProps) {
    const actorScrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: "left" | "right") => {
        if (actorScrollRef.current) {
            const { scrollLeft, clientWidth } = actorScrollRef.current;
            actorScrollRef.current.scrollTo({
                left: direction === "left" ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2,
                behavior: "smooth",
            });
        }
    };

    const cast = peoples.length > 0
        ? peoples
        : (movie.actor || []).map((name) => ({
            name,
            character: "Diễn viên",
            profile_path: null,
        } as Person));

    return (
        <section className="py-12 md:py-16">
            <div className="mb-9 max-w-4xl">
                <p className="eyebrow">Về bộ phim</p>
                <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-white md:text-4xl">
                    {movie.name}
                </h2>
                {movie.origin_name && (
                    <p className="mt-2 text-base font-medium text-foreground-muted">{movie.origin_name}</p>
                )}
                <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-md border border-border bg-background-secondary px-2.5 py-1.5 text-foreground-secondary">
                        {movie.type === "series" ? "Phim bộ" : "Phim lẻ"}
                    </span>
                    {movie.year > 0 && (
                        <span className="rounded-md border border-border bg-background-secondary px-2.5 py-1.5 text-foreground-secondary">
                            {movie.year}
                        </span>
                    )}
                    {movie.lang && (
                        <span className="rounded-md border border-border bg-background-secondary px-2.5 py-1.5 text-foreground-secondary">
                            {movie.lang}
                        </span>
                    )}
                    {movie.quality && (
                        <span className="rounded-md border border-primary/35 bg-primary/10 px-2.5 py-1.5 text-primary">
                            {movie.quality}
                        </span>
                    )}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.65fr)]">
                <article className="surface-panel p-5 sm:p-7 md:p-8">
                    <h3 className="text-xl font-bold tracking-tight text-white">Nội dung phim</h3>
                    {movie.content ? (
                        <div
                            className="mt-4 text-sm leading-7 text-foreground-secondary md:text-base md:leading-8"
                            dangerouslySetInnerHTML={{ __html: movie.content }}
                        />
                    ) : (
                        <p className="mt-4 text-sm text-foreground-muted">Nội dung đang được cập nhật.</p>
                    )}

                    <div className="mt-8 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
                        <div>
                            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                                <Film className="h-4 w-4 text-primary" />
                                Đạo diễn
                            </p>
                            <p className="mt-2 text-sm leading-6 text-foreground">
                                {movie.director?.join(", ") || "Đang cập nhật"}
                            </p>
                        </div>
                        <div>
                            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                                <Clock className="h-4 w-4 text-primary" />
                                Thời lượng
                            </p>
                            <p className="mt-2 text-sm leading-6 text-foreground">{movie.time || "Đang cập nhật"}</p>
                        </div>
                    </div>
                </article>

                <aside className="surface-panel p-5 sm:p-7">
                    <h3 className="text-lg font-bold text-white">Thông tin nhanh</h3>
                    <dl className="mt-5 divide-y divide-border">
                        <div className="flex items-center justify-between gap-5 py-3 first:pt-0">
                            <dt className="flex items-center gap-2 text-xs text-foreground-muted">
                                <Calendar className="h-4 w-4" />
                                Phát hành
                            </dt>
                            <dd className="text-sm font-semibold text-foreground">{movie.year || "N/A"}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-5 py-3">
                            <dt className="text-xs text-foreground-muted">Tình trạng</dt>
                            <dd className="text-right text-sm font-semibold text-foreground">
                                {movie.status === "completed" ? "Hoàn thành" : movie.episode_current || "Đang chiếu"}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-5 py-3">
                            <dt className="text-xs text-foreground-muted">TMDB</dt>
                            <dd className="text-right text-sm font-semibold text-foreground">
                                {movie.tmdb?.vote_average?.toFixed(1) || "N/A"}
                                {movie.tmdb?.vote_count ? (
                                    <span className="ml-1 text-xs font-normal text-foreground-muted">
                                        ({movie.tmdb.vote_count})
                                    </span>
                                ) : null}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-5 py-3">
                            <dt className="text-xs text-foreground-muted">TMDB ID</dt>
                            <dd className="text-sm font-semibold text-foreground">{movie.tmdb?.id || "N/A"}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-5 py-3 last:pb-0">
                            <dt className="flex items-center gap-2 text-xs text-foreground-muted">
                                <Star className="h-4 w-4" />
                                IMDb ID
                            </dt>
                            <dd className="text-sm font-semibold text-foreground">{movie.imdb?.id || "N/A"}</dd>
                        </div>
                    </dl>
                </aside>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
                {movie.category?.length > 0 && (
                    <div className="surface-panel p-5 sm:p-6">
                        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-foreground-muted">
                            <Tag className="h-4 w-4 text-primary" />
                            Thể loại
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {movie.category.map((category) => (
                                <Link
                                    key={category.slug}
                                    href={`/the-loai/${category.slug}`}
                                    prefetch={false}
                                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:border-border-strong hover:text-white"
                                >
                                    {category.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {movie.country?.length > 0 && (
                    <div className="surface-panel p-5 sm:p-6">
                        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-foreground-muted">
                            <Globe2 className="h-4 w-4 text-primary" />
                            Quốc gia
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {movie.country.map((country) => (
                                <Link
                                    key={country.slug}
                                    href={`/quoc-gia/${country.slug}`}
                                    prefetch={false}
                                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:border-border-strong hover:text-white"
                                >
                                    {country.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {cast.length > 0 && (
                <div className="mt-12">
                    <div className="mb-5 flex items-end justify-between gap-4">
                        <div>
                            <p className="eyebrow">Gương mặt trong phim</p>
                            <h3 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
                                <Users2 className="h-5 w-5 text-primary" />
                                Diễn viên
                            </h3>
                        </div>
                        <div className="hidden gap-2 sm:flex">
                            <button
                                type="button"
                                onClick={() => scroll("left")}
                                className="button-ghost h-10 min-h-10 w-10 p-0"
                                aria-label="Cuộn diễn viên sang trái"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => scroll("right")}
                                className="button-ghost h-10 min-h-10 w-10 p-0"
                                aria-label="Cuộn diễn viên sang phải"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div
                        ref={actorScrollRef}
                        className="hide-scrollbar -mx-[var(--page-gutter)] flex snap-x gap-3 overflow-x-auto px-[var(--page-gutter)] pb-2 md:mx-0 md:px-0"
                    >
                        {cast.map((person, index) => (
                            <article
                                key={`${person.name}-${index}`}
                                className="w-36 flex-none snap-start overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background-secondary sm:w-40"
                            >
                                <div className="relative aspect-[3/4] overflow-hidden bg-background-tertiary">
                                    {person.profile_path ? (
                                        <img
                                            src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                                            alt={person.name}
                                            className="h-full w-full object-cover object-top transition-transform duration-500 hover:scale-[1.035]"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center">
                                            <Users2 className="h-10 w-10 text-white/12" />
                                        </div>
                                    )}
                                </div>
                                <div className="p-3.5">
                                    <p className="line-clamp-1 text-sm font-semibold text-white">{person.name}</p>
                                    <p className="mt-1 line-clamp-1 text-xs text-foreground-muted">
                                        {person.character || "Diễn viên"}
                                    </p>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
