"use client";

import { use, useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ChevronRight, Home, PlayCircle } from "lucide-react";
import { resolveMultiProviderMovies } from "@/lib/player/provider-resolution";
import { buildSourceInventory } from "@/lib/player/source-inventory";
import VideoPlayer from "./VideoPlayer";
import EpisodeSelector from "./EpisodeSelector";
import MovieInfoDetails from "@/components/movie/MovieInfoDetails";
import SplashScreen from "@/components/ui/SplashScreen";
import MovieComments from "@/components/community/MovieComments";
import { getMovieComments, type CommunityCommentItem } from "@/app/bang-xep-hang/actions";
import { useMovieData } from "@/lib/hooks/use-movie-data";

interface Props {
  params: Promise<{ slug: string; episode: string }>;
  searchParams: Promise<{ sv?: string }>;
}

export default function WatchPage({ params, searchParams }: Props) {
  const { slug, episode } = use(params);
  const { sv } = use(searchParams);
  const requestedServerIndex = sv ? parseInt(sv, 10) : undefined;
  const [comments, setComments] = useState<CommunityCommentItem[]>([]);

  useEffect(() => {
    getMovieComments(slug).then(setComments);
  }, [slug]);

  const { data: resolution, loading } = useMovieData(`watch-resolution-${slug}`, () =>
    resolveMultiProviderMovies(slug)
  );

  const inventory = useMemo(() => {
    return buildSourceInventory(resolution, episode);
  }, [resolution, episode]);

  if (loading) {
    return <SplashScreen />;
  }

  const movie = resolution?.primaryMovie;
  if (!movie) {
    notFound();
  }

  const ophimEpisodes = resolution?.ophim?.episodes || movie.episodes || [];

  // Handle case where no valid episode stream exists in inventory
  if (inventory.sources.length === 0) {
    return (
      <div className="min-h-screen bg-[#07080a] pb-16 pt-20 md:pt-24">
        <div className="site-container">
          <nav className="flex items-center gap-2 text-xs text-foreground-muted sm:text-sm" aria-label="Đường dẫn">
            <Link href="/" className="transition-colors hover:text-white" aria-label="Trang chủ">
              <Home className="h-4 w-4" />
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/phim/${slug}`} className="line-clamp-1 transition-colors hover:text-white">
              {movie.name}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white">Tập {episode}</span>
          </nav>

          <div className="surface-panel my-12 p-8 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-warning mx-auto" />
            <h1 className="text-2xl font-bold text-white">Chưa có nguồn phát cho tập phim này</h1>
            <p className="text-foreground-muted max-w-md mx-auto text-sm leading-6">
              Tập phim bạn đang chọn hiện chưa được cập nhật bản xem trực tuyến. Vui lòng quay lại trang chi tiết phim hoặc thử lại sau.
            </p>
            <div className="pt-2">
              <Link href={`/phim/${slug}`} className="button-primary inline-flex">
                Quay lại trang chi tiết phim
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <span className="flex-none text-white">Tập {episode}</span>
        </nav>

        <div className="mb-5 mt-6 flex items-start gap-3">
          <div className="mt-1 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/12 text-primary">
            <PlayCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Đang phát · Tập {episode}
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
          episodeName={`Tập ${episode}`}
          inventory={inventory}
          requestedServerIndex={requestedServerIndex}
        />
      </div>

      <section className="site-container mt-8">
        <div className="surface-panel p-5 sm:p-7">
          <p className="eyebrow">Danh sách phát</p>
          <h2 className="mb-6 mt-2 text-2xl font-bold tracking-tight text-white">Chọn tập</h2>
          <EpisodeSelector
            episodes={ophimEpisodes}
            movieSlug={slug}
            currentEpisode={episode}
            initialServerIndex={requestedServerIndex || 0}
          />
        </div>
      </section>

      <div className="site-container mt-8">
        <MovieComments
          movieSlug={slug}
          movieTitle={movie.name}
          posterUrl={movie.thumb_url}
          episodeName={`Tập ${episode}`}
          initialComments={comments}
        />
      </div>

      <div id="movie-info" className="site-container mt-8 scroll-mt-24">
        <MovieInfoDetails movie={movie} peoples={[]} />
      </div>
    </div>
  );
}
