"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Clock, Eye, Globe2, Play, Users2 } from "lucide-react";
import { getMovieDetail, getImageUrl } from "@/lib/api/ophim";
import { getDefaultWatchEpisode } from "@/lib/player/watch-helpers";
import FavoriteButton from "./FavoriteButton";
import EpisodeList from "./EpisodeList";
import MovieComments from "@/components/community/MovieComments";
import { getMovieComments, type CommunityCommentItem } from "@/app/bang-xep-hang/actions";
import { useMovieData } from "@/lib/hooks/use-movie-data";

interface Props {
    params: Promise<{ slug: string }>;
}

export default function MovieDetailPage({ params }: Props) {
    const { slug } = use(params);
    const [comments, setComments] = useState<CommunityCommentItem[]>([]);

    useEffect(() => {
        getMovieComments(slug).then(setComments);
    }, [slug]);

    const { data, loading } = useMovieData(
        `movie-detail-${slug}`,
        () => getMovieDetail(slug)
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="skeleton h-[58vh] min-h-[34rem] md:min-h-[36rem] md:max-h-[42rem] lg:h-[60vh] lg:max-h-[44rem] xl:h-[66vh] xl:min-h-[40rem] xl:max-h-none" />
                <div className="site-container relative -mt-44 grid gap-7 pb-20 md:grid-cols-[12rem_1fr] md:gap-6 lg:grid-cols-[14rem_1fr] lg:gap-8 xl:grid-cols-[16rem_1fr] xl:gap-10">
                    <div className="skeleton aspect-[2/3] rounded-2xl" />
                    <div className="space-y-4 pt-8">
                        <div className="skeleton h-12 w-3/4 rounded-xl" />
                        <div className="skeleton h-5 w-1/2 rounded-lg" />
                        <div className="skeleton mt-6 h-12 w-72 rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (!data || !data.movie) {
        notFound();
    }

    const movie = data.movie;
    const episodes = data.episodes || movie.episodes || [];

    return (
        <div className="min-h-screen bg-background">
            <section className="relative h-[58vh] min-h-[34rem] overflow-hidden md:min-h-[36rem] md:max-h-[42rem] lg:h-[60vh] lg:max-h-[44rem] xl:h-[66vh] xl:min-h-[40rem] xl:max-h-none">
                <Image
                    src={getImageUrl(movie.poster_url || movie.thumb_url)}
                    alt=""
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,5,7,0.92)_0%,rgba(4,5,7,0.58)_44%,rgba(4,5,7,0.18)_100%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,5,7,0.5)_0%,transparent_35%,var(--background)_100%)]" />
            </section>

            <div className="site-container relative z-10 -mt-56 pb-20 md:-mt-52 lg:-mt-56 xl:-mt-64">
                <div className="grid items-end gap-7 md:grid-cols-[12rem_1fr] md:gap-6 lg:grid-cols-[14rem_1fr] lg:gap-8 xl:grid-cols-[16rem_1fr] xl:gap-10">
                    <div className="mx-auto w-40 md:mx-0 md:w-full">
                        <div className="relative aspect-[2/3] overflow-hidden rounded-[var(--radius-xl)] bg-background-secondary shadow-[var(--shadow-lg)] ring-1 ring-white/12">
                            <Image
                                src={getImageUrl(movie.thumb_url)}
                                alt={`Poster ${movie.name}`}
                                fill
                                sizes="(max-width: 767px) 160px, (max-width: 1023px) 192px, (max-width: 1279px) 224px, 256px"
                                className="object-cover object-top"
                            />
                        </div>
                    </div>

                    <div className="pb-1 text-center md:text-left">
                        <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                            {movie.quality && (
                                <span className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[var(--primary-text)]">
                                    {movie.quality}
                                </span>
                            )}
                            {movie.episode_current && (
                                <span className="rounded-md border border-white/12 bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white/85 backdrop-blur-sm">
                                    {movie.episode_current}
                                </span>
                            )}
                        </div>

                        <h1 className="mt-4 text-3xl font-extrabold leading-[1.02] tracking-[-0.05em] text-white sm:text-4xl md:text-4xl lg:text-5xl xl:text-6xl">
                            {movie.name}
                        </h1>
                        {movie.origin_name && (
                            <p className="mt-3 text-base font-medium text-white/65 md:text-lg">{movie.origin_name}</p>
                        )}

                        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-foreground-secondary md:justify-start">
                            {movie.year > 0 && (
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    {movie.year}
                                </span>
                            )}
                            {movie.time && (
                                <span className="flex items-center gap-1.5">
                                    <Clock className="h-4 w-4 text-primary" />
                                    {movie.time}
                                </span>
                            )}
                            {movie.lang && (
                                <span className="flex items-center gap-1.5">
                                    <Globe2 className="h-4 w-4 text-primary" />
                                    {movie.lang}
                                </span>
                            )}
                            {movie.view > 0 && (
                                <span className="flex items-center gap-1.5">
                                    <Eye className="h-4 w-4 text-primary" />
                                    {movie.view.toLocaleString()} lượt xem
                                </span>
                            )}
                        </div>

                        {movie.category && movie.category.length > 0 && (
                            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                                {movie.category.map((category: { slug: string; name: string }) => (
                                    <Link
                                        key={category.slug}
                                        href={`/the-loai/${category.slug}`}
                                        prefetch={false}
                                        className="rounded-full border border-white/10 bg-white/7 px-3 py-1.5 text-xs font-medium text-white/75 transition-colors hover:border-white/20 hover:bg-white/12 hover:text-white"
                                    >
                                        {category.name}
                                    </Link>
                                ))}
                            </div>
                        )}

                        <div className="mt-7 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                            {(() => {
                                const defaultEp = getDefaultWatchEpisode(episodes);
                                if (defaultEp && defaultEp.slug) {
                                    return (
                                        <Link
                                            href={`/xem-phim/${movie.slug}/${defaultEp.slug}`}
                                            prefetch={false}
                                            className="button-primary min-w-36"
                                        >
                                            <Play className="h-4 w-4 fill-current" />
                                            Xem phim
                                        </Link>
                                    );
                                }
                                return (
                                    <button
                                        type="button"
                                        disabled
                                        className="button-secondary min-w-36 cursor-not-allowed opacity-50"
                                    >
                                        <Play className="h-4 w-4" />
                                        Chưa có nguồn phát
                                    </button>
                                );
                            })()}
                            <FavoriteButton movie={movie} />
                        </div>
                    </div>
                </div>

                <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.75fr)]">
                    <section className="surface-panel p-5 sm:p-7 md:p-8">
                        <p className="eyebrow">Giới thiệu</p>
                        <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">Nội dung phim</h2>
                        {movie.content ? (
                            <div
                                className="mt-5 text-sm leading-7 text-foreground-secondary md:text-base md:leading-8"
                                dangerouslySetInnerHTML={{ __html: movie.content }}
                            />
                        ) : (
                            <p className="mt-5 text-foreground-muted">Nội dung đang được cập nhật.</p>
                        )}
                    </section>

                    <aside className="surface-panel p-5 sm:p-7">
                        <p className="eyebrow">Thông tin</p>
                        <dl className="mt-5 divide-y divide-border">
                            <div className="py-3 first:pt-0">
                                <dt className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">Đạo diễn</dt>
                                <dd className="mt-1.5 text-sm leading-6 text-foreground">
                                    {movie.director?.join(", ") || "Đang cập nhật"}
                                </dd>
                            </div>
                            <div className="py-3">
                                <dt className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">Tình trạng</dt>
                                <dd className="mt-1.5 text-sm text-foreground">
                                    {movie.episode_current || movie.status || "Đang cập nhật"}
                                </dd>
                            </div>
                            <div className="py-3 last:pb-0">
                                <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                                    <Users2 className="h-3.5 w-3.5" />
                                    Diễn viên
                                </dt>
                                <dd className="mt-1.5 text-sm leading-6 text-foreground-secondary">
                                    {movie.actor?.length > 0
                                        ? `${movie.actor.slice(0, 10).join(", ")}${movie.actor.length > 10 ? "…" : ""}`
                                        : "Đang cập nhật"}
                                </dd>
                            </div>
                        </dl>
                    </aside>
                </div>

                {episodes.length > 0 && (
                    <section className="surface-panel mt-8 p-5 sm:p-7 md:p-8">
                        <div className="mb-6">
                            <p className="eyebrow">Phát trực tuyến</p>
                            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">Danh sách tập</h2>
                        </div>
                        <EpisodeList episodes={episodes} movieSlug={movie.slug} />
                    </section>
                )}

                <div className="mt-8">
                    <MovieComments
                        movieSlug={slug}
                        movieTitle={movie.name}
                        posterUrl={movie.thumb_url}
                        initialComments={comments}
                    />
                </div>
            </div>
        </div>
    );
}
