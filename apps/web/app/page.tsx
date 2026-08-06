"use client";

import HeroBanner from "@/components/movie/HeroBanner";
import MovieSlider from "@/components/movie/MovieSlider";
import { HeroSkeleton, MovieSliderSkeleton } from "@/components/ui/Skeleton";
import { getNewlyUpdatedMovies, getMoviesByType } from "@/lib/api/unified";
import { useMovieData } from "@/lib/hooks/use-movie-data";

export default function HomePage() {
  const { data, loading } = useMovieData("home-data", async () => {
    const activeSections = [
      { key: "newMovies", fn: () => getNewlyUpdatedMovies(1), extract: (d: any) => d?.items || [] },
      { key: "singleMovies", fn: () => getMoviesByType("phim-le", 1), extract: (d: any) => d?.data?.items || [] },
      { key: "seriesMovies", fn: () => getMoviesByType("phim-bo", 1), extract: (d: any) => d?.data?.items || [] },
      { key: "chieuRap", fn: () => getMoviesByType("phim-chieu-rap", 1), extract: (d: any) => d?.data?.items || [] },
      { key: "animeMovies", fn: () => getMoviesByType("hoat-hinh", 1), extract: (d: any) => d?.data?.items || [] },
      { key: "tvShows", fn: () => getMoviesByType("tv-shows", 1), extract: (d: any) => d?.data?.items || [] },
      { key: "vietsubMovies", fn: () => getMoviesByType("phim-vietsub", 1), extract: (d: any) => d?.data?.items || [] },
      { key: "thuyetMinhMovies", fn: () => getMoviesByType("phim-thuyet-minh", 1), extract: (d: any) => d?.data?.items || [] },
      { key: "longTiengMovies", fn: () => getMoviesByType("phim-long-tieng", 1), extract: (d: any) => d?.data?.items || [] },
      { key: "subteam", fn: () => getMoviesByType("subteam", 1), extract: (d: any) => d?.data?.items || [] },
    ];

    const results = await Promise.allSettled(activeSections.map((sec) => sec.fn()));

    const resultObj: Record<string, any[]> = {};
    activeSections.forEach((sec, idx) => {
      const res = results[idx];
      if (res.status === "fulfilled" && res.value) {
        resultObj[sec.key] = sec.extract(res.value) || [];
      } else {
        resultObj[sec.key] = [];
      }
    });

    return resultObj;
  });

  if (loading && !data) {
    return (
      <div className="min-h-screen">
        <HeroSkeleton />
        <div className="site-container -mt-8 space-y-10 pb-16">
          {Array.from({ length: 3 }).map((_, index) => (
            <section key={index}>
              <div className="skeleton mb-5 h-7 w-44 rounded-md" />
              <MovieSliderSkeleton />
            </section>
          ))}
        </div>
      </div>
    );
  }

  const allMovies = data ? Object.values(data).flat() : [];
  const hasData = allMovies.length > 0;

  if (!data || !hasData) {
    return (
      <div className="page-shell">
        <div className="empty-state">
          <p className="empty-state__title">Không thể tải nội dung trang chủ</p>
          <p className="empty-state__description">Vui lòng tải lại trang để thử kết nối lại với nguồn phim.</p>
        </div>
      </div>
    );
  }

  // Find hero movie from first section with valid movies
  let heroMovie = null;
  const sectionKeysInOrder = [
    "newMovies",
    "singleMovies",
    "seriesMovies",
    "chieuRap",
    "animeMovies",
    "tvShows",
    "vietsubMovies",
    "thuyetMinhMovies",
    "longTiengMovies",
    "subteam",
  ];

  for (const k of sectionKeysInOrder) {
    if (data[k] && data[k].length > 0) {
      heroMovie = data[k][0];
      break;
    }
  }

  const sections = [
    { title: "Phim mới cập nhật", movies: data.newMovies || [], href: "/danh-sach/phim-moi" },
    { title: "Phim lẻ nổi bật", movies: data.singleMovies || [], href: "/danh-sach/phim-le" },
    { title: "Phim bộ đáng xem", movies: data.seriesMovies || [], href: "/danh-sach/phim-bo" },
    { title: "Phim chiếu rạp", movies: data.chieuRap || [], href: "/danh-sach/phim-chieu-rap" },
    { title: "Hoạt hình", movies: data.animeMovies || [], href: "/danh-sach/hoat-hinh" },
    { title: "TV Shows", movies: data.tvShows || [], href: "/danh-sach/tv-shows" },
    { title: "Phim Vietsub", movies: data.vietsubMovies || [], href: "/danh-sach/phim-vietsub" },
    { title: "Thuyết minh", movies: data.thuyetMinhMovies || [], href: "/danh-sach/phim-thuyet-minh" },
    { title: "Lồng tiếng", movies: data.longTiengMovies || [], href: "/danh-sach/phim-long-tieng" },
    { title: "Từ các Subteam", movies: data.subteam || [], href: "/danh-sach/subteam" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {heroMovie ? <HeroBanner movie={heroMovie} /> : <HeroSkeleton />}

      <div className="site-container relative z-10 -mt-12 pb-16 md:-mt-8 md:pb-20 lg:-mt-10 xl:-mt-16">
        {sections.map(
          (section) =>
            section.movies.length > 0 && (
              <MovieSlider
                key={section.href}
                title={section.title}
                movies={section.movies.slice(0, 12)}
                href={section.href}
              />
            )
        )}
      </div>
    </div>
  );
}
