import HeroBanner from "@/components/movie/HeroBanner";
import MovieSlider from "@/components/movie/MovieSlider";
import LazyMovieSection from "@/components/home/LazyMovieSection";
import FamilyCommunitySection from "@/components/community/FamilyCommunitySection";
import { fetchHomeInitialData } from "@/lib/api/home-data";
import {
  getLeaderboardMovies,
  getRecentCommunityComments,
  getCommunityAccounts,
} from "@/app/bang-xep-hang/actions";
import { HeroSkeleton } from "@/components/ui/Skeleton";

export const revalidate = 180; // 3 minutes Server Revalidate

export default async function HomePage() {
  const [initialData, leaderboard, recentComments, accounts] = await Promise.all([
    fetchHomeInitialData(),
    getLeaderboardMovies(),
    getRecentCommunityComments(30),
    getCommunityAccounts(),
  ]);

  if (!initialData.hasInitialData) {
    return (
      <div className="page-shell">
        <div className="empty-state">
          <p className="empty-state__title">Không thể tải nội dung trang chủ</p>
          <p className="empty-state__description">
            Vui lòng tải lại trang để thử kết nối lại với nguồn phim.
          </p>
        </div>
      </div>
    );
  }

  const { heroMovie, newMovies, seriesMovies, singleMovies, animeMovies, chieuRap } =
    initialData;

  const primarySections = [
    { title: "Phim mới cập nhật", movies: newMovies, href: "/danh-sach/phim-moi" },
    { title: "Phim bộ đáng xem", movies: seriesMovies, href: "/danh-sach/phim-bo" },
    { title: "Phim lẻ nổi bật", movies: singleMovies, href: "/danh-sach/phim-le" },
    { title: "Hoạt hình", movies: animeMovies, href: "/danh-sach/hoat-hinh" },
    { title: "Phim chiếu rạp", movies: chieuRap, href: "/danh-sach/phim-chieu-rap" },
  ];

  const secondarySections = [
    { title: "TV Shows", type: "tv-shows", href: "/danh-sach/tv-shows" },
    { title: "Phim Vietsub", type: "phim-vietsub", href: "/danh-sach/phim-vietsub" },
    { title: "Thuyết minh", type: "phim-thuyet-minh", href: "/danh-sach/phim-thuyet-minh" },
    { title: "Lồng tiếng", type: "phim-long-tieng", href: "/danh-sach/phim-long-tieng" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {heroMovie ? <HeroBanner movie={heroMovie} /> : <HeroSkeleton />}

      <div className="site-container relative z-10 -mt-12 pb-16 md:-mt-8 md:pb-20 lg:-mt-10 xl:-mt-16 space-y-6">
        {/* First section: Phim mới */}
        {primarySections[0]?.movies?.length > 0 && (
          <MovieSlider
            title={primarySections[0].title}
            movies={primarySections[0].movies.slice(0, 12)}
            href={primarySections[0].href}
          />
        )}

        {/* Family Leaderboard & Discussions directly on Home Page */}
        <FamilyCommunitySection
          initialLeaderboard={leaderboard}
          initialComments={recentComments}
          initialAccounts={accounts}
        />

        {/* Remaining Primary Server-rendered Sections */}
        {primarySections.slice(1).map(
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

        {/* Secondary Lazy-loaded Sections */}
        {secondarySections.map((sec) => (
          <LazyMovieSection
            key={sec.type}
            title={sec.title}
            type={sec.type}
            href={sec.href}
          />
        ))}
      </div>
    </div>
  );
}
