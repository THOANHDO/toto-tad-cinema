"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Home, PlayCircle } from "lucide-react";
import { getMovieDetail, getMoviePeoples, getMovieDetailNguonC, getMovieDetailPhimApi } from "@/lib/api/ophim";
import VideoPlayer from "./VideoPlayer";
import EpisodeSelector from "./EpisodeSelector";
import MovieInfoDetails from "@/components/movie/MovieInfoDetails";
import SplashScreen from "@/components/ui/SplashScreen";
import { useMovieData } from "@/lib/hooks/use-movie-data";

interface Props {
    params: Promise<{ slug: string; episode: string }>;
    searchParams: Promise<{ sv?: string }>;
}

export default function WatchPage({ params, searchParams }: Props) {
    const { slug, episode } = use(params);
    const { sv } = use(searchParams);
    const requestedServerIndex = sv ? parseInt(sv) : undefined;

    const { data: watchData, loading } = useMovieData(`watch-${slug}`, async () => {
        const [d, p, n, pa] = await Promise.all([
            getMovieDetail(slug),
            getMoviePeoples(slug).catch(() => null),
            getMovieDetailNguonC(slug).catch(() => null),
            getMovieDetailPhimApi(slug).catch(() => null)
        ]);
        return { d, p, n, pa };
    });

    if (loading) {
        return <SplashScreen />;
    }

    if (!watchData || !watchData.d || !watchData.d.movie) {
        notFound();
    }

    const movie = watchData.d.movie;
    const peoples = watchData.p?.data?.peoples || [];
    const episodes = watchData.d.episodes || movie.episodes || [];

    // Find current episode and server more efficiently
    let currentEpisode = null;
    let currentServerIndex = -1;

    // Try finding in requested server first
    if (requestedServerIndex !== undefined && episodes[requestedServerIndex]) {
        currentEpisode = episodes[requestedServerIndex].server_data?.find((ep: { slug: string }) => ep.slug === episode);
        if (currentEpisode) {
            currentServerIndex = requestedServerIndex;
        }
    }

    // Default to search in all servers if not found in requested server
    if (!currentEpisode) {
        currentServerIndex = episodes.findIndex((server: any) => 
            server.server_data?.some((ep: { slug: string }) => ep.slug === episode)
        );

        if (currentServerIndex !== -1) {
            const serverData = episodes[currentServerIndex].server_data;
            currentEpisode = serverData.find((ep: { slug: string }) => ep.slug === episode);
        }
    }

    if (!currentEpisode) {
        notFound();
    }

    const serverData = episodes[currentServerIndex]?.server_data || [];
    const currentEpisodeIndex = serverData.indexOf(currentEpisode);
    const prevEpisode = serverData[currentEpisodeIndex - 1];
    const nextEpisode = serverData[currentEpisodeIndex + 1];

    return (
        <div className="min-h-screen bg-[#07080a] pb-16 pt-20 md:pt-24">
            <div className="site-container">
                <nav className="flex items-center gap-2 overflow-hidden text-xs text-foreground-muted sm:text-sm" aria-label="Đường dẫn">
                    <Link href="/" className="flex-none transition-colors hover:text-white" aria-label="Trang chủ">
                        <Home className="h-4 w-4" />
                    </Link>
                    <ChevronRight className="h-4 w-4 flex-none" />
                    <Link href={`/phim/${slug}`} className="line-clamp-1 transition-colors hover:text-white">
                        {movie.name}
                    </Link>
                    <ChevronRight className="h-4 w-4 flex-none" />
                    <span className="flex-none text-white">Tập {currentEpisode.name}</span>
                </nav>

                <div className="mb-5 mt-6 flex items-start gap-3">
                    <div className="mt-1 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/12 text-primary">
                        <PlayCircle className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                            Đang phát · Tập {currentEpisode.name}
                        </p>
                        <h1 className="mt-1 text-xl font-bold tracking-[-0.025em] text-white sm:text-2xl">
                            {movie.name}
                        </h1>
                    </div>
                </div>

                <VideoPlayer
                    movieSlug={slug}
                    movieName={movie.name}
                    movieThumb={movie.thumb_url}
                    episode={episode}
                    episodeName={currentEpisode.name}
                    embedUrl={currentEpisode.link_embed}
                    m3u8Url={currentEpisode.link_m3u8}
                    prevEpisodeSlug={prevEpisode?.slug}
                    nextEpisodeSlug={nextEpisode?.slug}
                    serverIndex={currentServerIndex}

                    nguonCData={watchData.n}
                    phimApiData={watchData.pa}
                />
            </div>

            <section className="site-container mt-8">
                <div className="surface-panel p-5 sm:p-7">
                    <p className="eyebrow">Danh sách phát</p>
                    <h2 className="mb-6 mt-2 text-2xl font-bold tracking-tight text-white">Chọn tập</h2>
                <EpisodeSelector
                    episodes={episodes}
                    movieSlug={slug}
                    currentEpisode={episode}
                    initialServerIndex={currentServerIndex}
                />
                </div>
            </section>

            <div id="movie-info" className="site-container scroll-mt-24">
                <MovieInfoDetails movie={movie} peoples={peoples} />
            </div>
        </div>
    );
}
