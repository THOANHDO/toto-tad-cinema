"use client";

import HeroBanner from "@/components/movie/HeroBanner";
import MovieSlider from "@/components/movie/MovieSlider";
import { HeroSkeleton, MovieSliderSkeleton } from "@/components/ui/Skeleton";
import { getNewlyUpdatedMovies, getMoviesByType } from "@/lib/api/unified";
import { useMovieData } from "@/lib/hooks/use-movie-data";

export default function HomePage() {
  const { data, loading } = useMovieData("home-data", async () => {
    const [
      newMovies,
      singleMovies,
      seriesMovies,
      animeMovies,
      tvShows,
      vietsubMovies,
      thuyetMinhMovies,
      longTiengMovies,
      boDangChieu,
      boHoanThanh,
      sapChieu,
      subteam,
      chieuRap
    ] = await Promise.all([
      getNewlyUpdatedMovies(1),
      getMoviesByType("phim-le", 1),
      getMoviesByType("phim-bo", 1),
      getMoviesByType("hoat-hinh", 1),
      getMoviesByType("tv-shows", 1),
      getMoviesByType("phim-vietsub", 1),
      getMoviesByType("phim-thuyet-minh", 1),
      getMoviesByType("phim-long-tieng", 1),
      getMoviesByType("phim-bo-dang-chieu", 1),
      getMoviesByType("phim-bo-hoan-thanh", 1),
      getMoviesByType("phim-sap-chieu", 1),
      getMoviesByType("subteam", 1),
      getMoviesByType("phim-chieu-rap", 1),
    ]);

    return {
      newMovies: newMovies?.items || [],
      singleMovies: singleMovies?.data?.items || [],
      seriesMovies: seriesMovies?.data?.items || [],
      animeMovies: animeMovies?.data?.items || [],
      tvShows: tvShows?.data?.items || [],
      vietsubMovies: vietsubMovies?.data?.items || [],
      thuyetMinhMovies: thuyetMinhMovies?.data?.items || [],
      longTiengMovies: longTiengMovies?.data?.items || [],
      boDangChieu: boDangChieu?.data?.items || [],
      boHoanThanh: boHoanThanh?.data?.items || [],
      sapChieu: sapChieu?.data?.items || [],
      subteam: subteam?.data?.items || [],
      chieuRap: chieuRap?.data?.items || [],
    };
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

  if (!data) {
    return (
      <div className="page-shell">
        <div className="empty-state">
          <p className="empty-state__title">Không thể tải nội dung trang chủ</p>
          <p className="empty-state__description">Vui lòng tải lại trang để thử kết nối lại với nguồn phim.</p>
        </div>
      </div>
    );
  }

  const { newMovies } = data;
  const heroMovie = newMovies[0];

  const sections = [
    { title: "Phim mới cập nhật", movies: data.newMovies, href: "/danh-sach/phim-moi" },
    { title: "Phim lẻ nổi bật", movies: data.singleMovies, href: "/danh-sach/phim-le" },
    { title: "Phim bộ đáng xem", movies: data.seriesMovies, href: "/danh-sach/phim-bo" },
    { title: "Phim chiếu rạp", movies: data.chieuRap, href: "/danh-sach/phim-chieu-rap" },
    { title: "Hoạt hình", movies: data.animeMovies, href: "/danh-sach/hoat-hinh" },
    { title: "TV Shows", movies: data.tvShows, href: "/danh-sach/tv-shows" },
    { title: "Phim Vietsub", movies: data.vietsubMovies, href: "/danh-sach/phim-vietsub" },
    { title: "Thuyết minh", movies: data.thuyetMinhMovies, href: "/danh-sach/phim-thuyet-minh" },
    { title: "Lồng tiếng", movies: data.longTiengMovies, href: "/danh-sach/phim-long-tieng" },
    { title: "Bộ đang chiếu", movies: data.boDangChieu, href: "/danh-sach/phim-bo-dang-chieu" },
    { title: "Bộ hoàn thành", movies: data.boHoanThanh, href: "/danh-sach/phim-bo-hoan-thanh" },
    { title: "Sắp chiếu", movies: data.sapChieu, href: "/danh-sach/phim-sap-chieu" },
    { title: "Từ các Subteam", movies: data.subteam, href: "/danh-sach/subteam" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      {heroMovie ? (
        <HeroBanner movie={heroMovie} />
      ) : (
        <HeroSkeleton />
      )}

      {/* Content Sections */}
      <div className="site-container relative z-10 -mt-12 pb-16 md:-mt-8 md:pb-20 lg:-mt-10 xl:-mt-16">
        {sections.map((section) => (
          section.movies.length > 0 && (
            <MovieSlider
              key={section.href}
              title={section.title}
              movies={section.movies.slice(0, 12)}
              href={section.href}
            />
          )
        ))}
      </div>
    </div>
  );
}
