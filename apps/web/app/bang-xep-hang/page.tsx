import { Trophy } from "lucide-react";
import {
  getLeaderboardMovies,
  getRecentCommunityComments,
  getCommunityAccounts,
} from "./actions";
import FamilyCommunitySection from "@/components/community/FamilyCommunitySection";

export const metadata = {
  title: "Bảng Xếp Hạng & Bình Luận Gia Đình | ToTo TAD Cinema",
  description: "Bảng xếp hạng những bộ phim được yêu thích nhất và thảo luận của gia đình, bạn bè.",
};

export default async function LeaderboardPage() {
  const [leaderboard, recentComments, accounts] = await Promise.all([
    getLeaderboardMovies(),
    getRecentCommunityComments(50),
    getCommunityAccounts(),
  ]);

  return (
    <main className="min-h-screen bg-[#07080a] pb-24 pt-20 md:pt-24">
      <div className="site-container">
        {/* Header Hero */}
        <div className="mb-6 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-primary backdrop-blur-md">
            <Trophy className="h-3.5 w-3.5" />
            Cộng đồng gia đình & bạn bè
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Bảng Xếp Hạng & Thảo Luận
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground-muted sm:text-base">
            Tổng hợp những bộ phim được cả nhà thả tim nhiều nhất và các bình luận, cảm xúc mới nhất.
          </p>
        </div>

        <FamilyCommunitySection
          initialLeaderboard={leaderboard}
          initialComments={recentComments}
          initialAccounts={accounts}
          showTitle={false}
        />
      </div>
    </main>
  );
}
