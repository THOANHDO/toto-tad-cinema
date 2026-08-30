import { Trophy, MessageSquare, Heart, Play, Film, Sparkles, ChevronRight, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getLeaderboardMovies, getRecentCommunityComments } from "./actions";
import { getImageUrl } from "@/lib/api/ophim";

export const metadata = {
  title: "Bảng Xếp Hạng & Bình Luận Gia Đình | ToTo TAD Cinema",
  description: "Bảng xếp hạng những bộ phim được yêu thích nhất và thảo luận của gia đình, bạn bè.",
};

export default async function LeaderboardPage() {
  const [leaderboard, recentComments] = await Promise.all([
    getLeaderboardMovies(),
    getRecentCommunityComments(40),
  ]);

  return (
    <main className="min-h-screen bg-[#07080a] pb-24 pt-20 md:pt-24">
      <div className="site-container">
        {/* Header Hero */}
        <div className="mb-10 text-center sm:text-left">
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

        {/* Top 3 Podium Cards (if available) */}
        {leaderboard.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5 text-warning" />
              <h2 className="text-xl font-bold text-white sm:text-2xl">Top Phim Được Yêu Thích Nhất</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {leaderboard.slice(0, 3).map((item, idx) => {
                const rankColor =
                  idx === 0
                    ? "from-amber-500/20 via-amber-500/5 to-transparent border-amber-500/40 text-amber-400"
                    : idx === 1
                    ? "from-slate-300/20 via-slate-300/5 to-transparent border-slate-300/40 text-slate-300"
                    : "from-amber-700/20 via-amber-700/5 to-transparent border-amber-700/40 text-amber-600";

                const badgeBg =
                  idx === 0
                    ? "bg-amber-500 text-black shadow-amber-500/40"
                    : idx === 1
                    ? "bg-slate-300 text-black shadow-slate-300/40"
                    : "bg-amber-700 text-white shadow-amber-700/40";

                const medal = idx === 0 ? "🥇 TOP 1" : idx === 1 ? "🥈 TOP 2" : "🥉 TOP 3";

                return (
                  <div
                    key={item.movie_slug}
                    className={`relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] border bg-gradient-to-b p-5 backdrop-blur-md transition-all hover:scale-[1.01] ${rankColor}`}
                  >
                    {/* Rank Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-black tracking-wider shadow-lg ${badgeBg}`}>
                        {medal}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-error">
                        <Heart className="h-4 w-4 fill-error text-error" />
                        <span>{item.like_count} lượt thích</span>
                      </div>
                    </div>

                    {/* Movie Info */}
                    <div className="mt-4 flex gap-4">
                      <div className="relative aspect-[2/3] w-20 flex-none overflow-hidden rounded-lg bg-black/60 ring-1 ring-white/15">
                        <Image
                          src={getImageUrl(item.poster_url || "")}
                          alt={item.movie_title}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          <Link
                            href={`/phim/${item.movie_slug}`}
                            className="line-clamp-2 text-base font-bold text-white transition-colors hover:text-primary"
                          >
                            {item.movie_title}
                          </Link>
                          {/* Likers pills */}
                          <div className="mt-2 flex flex-wrap items-center gap-1">
                            {item.likers.slice(0, 3).map((liker, lIdx) => (
                              <span
                                key={lIdx}
                                className="inline-flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/85"
                              >
                                <User className="h-2.5 w-2.5" />
                                {liker}
                              </span>
                            ))}
                            {item.likers.length > 3 && (
                              <span className="text-[10px] text-foreground-muted">
                                +{item.likers.length - 3}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 pt-2">
                          <Link
                            href={`/phim/${item.movie_slug}`}
                            className="button-primary inline-flex min-h-8 w-full items-center justify-center gap-1.5 px-3 text-xs font-semibold"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            Xem phim
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Main Grid: Remaining Leaderboard & Recent Comments Feed */}
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Left Column: Full Ranking List */}
          <section className="surface-panel p-5 sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-white sm:text-xl">
                  Bảng xếp hạng đầy đủ
                </h2>
              </div>
              <span className="text-xs text-foreground-muted">
                {leaderboard.length} phim được yêu thích
              </span>
            </div>

            {leaderboard.length === 0 ? (
              <div className="my-10 text-center space-y-3">
                <Heart className="h-10 w-10 text-foreground-muted mx-auto" />
                <p className="text-sm font-medium text-white">Chưa có bộ phim nào được thả tim</p>
                <p className="text-xs text-foreground-muted max-w-sm mx-auto">
                  Hãy bấm nút Yêu thích (❤️) ở các bộ phim bạn thích để đưa phim lên Bảng Xếp Hạng nhé!
                </p>
              </div>
            ) : (
              <div className="mt-5 divide-y divide-white/6">
                {leaderboard.map((item, idx) => (
                  <div
                    key={item.movie_slug}
                    className="flex items-center gap-4 py-3.5 transition-colors hover:bg-white/[0.02]"
                  >
                    {/* Rank Number */}
                    <span
                      className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg text-xs font-black ${
                        idx < 3 ? "bg-primary text-white" : "bg-white/10 text-foreground-muted"
                      }`}
                    >
                      #{idx + 1}
                    </span>

                    {/* Movie Thumb */}
                    <div className="relative aspect-[2/3] w-11 flex-none overflow-hidden rounded-md bg-black/60">
                      <Image
                        src={getImageUrl(item.poster_url || "")}
                        alt={item.movie_title}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    </div>

                    {/* Title & Likers */}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/phim/${item.movie_slug}`}
                        className="line-clamp-1 text-sm font-bold text-white transition-colors hover:text-primary"
                      >
                        {item.movie_title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-foreground-muted">
                        <span className="flex items-center gap-1 text-error font-semibold">
                          <Heart className="h-3 w-3 fill-error" />
                          {item.like_count}
                        </span>
                        <span>•</span>
                        <span className="line-clamp-1 text-[11px]">
                          {item.likers.join(", ")}
                        </span>
                      </div>
                    </div>

                    {/* Action */}
                    <Link
                      href={`/phim/${item.movie_slug}`}
                      className="button-secondary min-h-8 px-3 text-xs flex-none"
                    >
                      Xem
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Right Column: Recent Comments Wall */}
          <section className="surface-panel p-5 sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-white sm:text-xl">
                  Góc Thảo Luận Mới Nhất
                </h2>
              </div>
              <span className="text-xs text-foreground-muted">
                {recentComments.length} bình luận
              </span>
            </div>

            {recentComments.length === 0 ? (
              <div className="my-10 text-center space-y-3">
                <MessageSquare className="h-10 w-10 text-foreground-muted mx-auto" />
                <p className="text-sm font-medium text-white">Chưa có bình luận nào</p>
                <p className="text-xs text-foreground-muted max-w-xs mx-auto">
                  Vào xem một bộ phim bất kỳ và để lại bình luận để cùng trò chuyện với bạn bè và gia đình!
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3.5 max-h-[680px] overflow-y-auto pr-1">
                {recentComments.map((cmt) => (
                  <div
                    key={cmt.id}
                    className="rounded-xl border border-white/6 bg-white/[0.02] p-3.5 transition-colors hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                          {cmt.author_name ? cmt.author_name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <span className="text-xs font-bold text-white">
                          {cmt.author_name}
                        </span>
                        {cmt.reply_to_name && (
                          <span className="text-[10px] text-foreground-muted">
                            trả lời <strong className="text-primary/90 font-medium">@{cmt.reply_to_name}</strong>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-foreground-muted">
                        {new Date(cmt.created_at).toLocaleDateString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "numeric",
                        })}
                      </span>
                    </div>

                    <Link
                      href={`/phim/${cmt.movie_slug}`}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary/90 hover:underline"
                    >
                      <Film className="h-3 w-3" />
                      <span className="line-clamp-1">{cmt.movie_title}</span>
                      {cmt.episode_name && (
                        <span className="text-[10px] text-white/60">({cmt.episode_name})</span>
                      )}
                    </Link>

                    <p className="mt-1.5 whitespace-pre-wrap break-words text-xs text-foreground-secondary leading-relaxed">
                      {cmt.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
