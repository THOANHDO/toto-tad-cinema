"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Trophy,
  MessageSquare,
  Heart,
  Play,
  Film,
  Sparkles,
  User,
  Reply,
  Trash2,
} from "lucide-react";
import { getImageUrl } from "@/lib/api/ophim";
import {
  postMovieComment,
  deleteMovieComment,
  getRecentCommunityComments,
  getLeaderboardMovies,
  type LeaderboardMovieItem,
  type CommunityCommentItem,
  type CommunityAccount,
} from "@/app/bang-xep-hang/actions";
import MentionTextarea from "./MentionTextarea";
import CommentContent from "./CommentContent";

interface FamilyCommunitySectionProps {
  initialLeaderboard: LeaderboardMovieItem[];
  initialComments: CommunityCommentItem[];
  initialAccounts: CommunityAccount[];
  showTitle?: boolean;
}

export default function FamilyCommunitySection({
  initialLeaderboard,
  initialComments,
  initialAccounts,
  showTitle = true,
}: FamilyCommunitySectionProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardMovieItem[]>(initialLeaderboard);
  const [comments, setComments] = useState<CommunityCommentItem[]>(initialComments);
  const [accounts] = useState<CommunityAccount[]>(initialAccounts);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isPending, startTransition] = useTransition();

  const refreshData = async () => {
    try {
      const [newLeaderboard, newComments] = await Promise.all([
        getLeaderboardMovies(),
        getRecentCommunityComments(40),
      ]);
      setLeaderboard(newLeaderboard);
      setComments(newComments);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu cộng đồng:", err);
    }
  };

  const startReply = (targetId: string, authorName: string) => {
    setActiveReplyId(targetId);
    setReplyContent(`@${authorName} `);
  };

  const handleReplySubmit = (parentComment: CommunityCommentItem) => {
    const text = replyContent.trim();
    if (!text) return;

    startTransition(async () => {
      const res = await postMovieComment({
        movie_slug: parentComment.movie_slug,
        movie_title: parentComment.movie_title,
        poster_url: parentComment.poster_url,
        parent_id: parentComment.id,
        content: text,
      });

      if (!res?.error) {
        setReplyContent("");
        setActiveReplyId(null);
        await refreshData();
      }
    });
  };

  const handleDelete = (commentId: string, movieSlug?: string) => {
    startTransition(async () => {
      const res = await deleteMovieComment(commentId, movieSlug);
      if (!res?.error) {
        await refreshData();
      }
    });
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffSeconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diffSeconds < 60) return "Vừa xong";
      const diffMinutes = Math.floor(diffSeconds / 60);
      if (diffMinutes < 60) return `${diffMinutes} phút trước`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} ngày trước`;
    } catch (_e) {
      return "";
    }
  };

  return (
    <div className="space-y-8 my-10">
      {showTitle && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              <Trophy className="h-3.5 w-3.5" />
              Cộng đồng gia đình & bạn bè
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Bảng Xếp Hạng & Góc Thảo Luận
            </h2>
          </div>
          <Link
            href="/bang-xep-hang"
            className="button-secondary min-h-9 px-4 text-xs font-semibold"
          >
            Xem chi tiết
          </Link>
        </div>
      )}

      {/* Top 3 Podium (if any) */}
      {leaderboard.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                className={`relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-xl)] border bg-gradient-to-b p-4 backdrop-blur-md transition-all hover:scale-[1.01] ${rankColor}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black tracking-wider shadow-lg ${badgeBg}`}>
                      {medal}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-error">
                      <Heart className="h-3.5 w-3.5 fill-error text-error" />
                      <span>{item.like_count} lượt thích</span>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-3">
                    <div className="relative aspect-[2/3] w-16 flex-none overflow-hidden rounded-lg bg-black/60 ring-1 ring-white/15">
                      <Image
                        src={getImageUrl(item.poster_url || "")}
                        alt={item.movie_title}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div>
                        <Link
                          href={`/phim/${item.movie_slug}`}
                          className="line-clamp-2 text-sm font-bold text-white transition-colors hover:text-primary"
                        >
                          {item.movie_title}
                        </Link>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          {item.likers.slice(0, 2).map((liker, lIdx) => (
                            <span
                              key={lIdx}
                              className="inline-flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/85"
                            >
                              <User className="h-2.5 w-2.5" />
                              {liker}
                            </span>
                          ))}
                          {item.likers.length > 2 && (
                            <span className="text-[10px] text-foreground-muted">
                              +{item.likers.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
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
            );
          })}
        </div>
      )}

      {/* Main Grid: Full Ranking & Interactive Comments Feed */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        {/* Left Column: Full Ranking List */}
        <section className="surface-panel p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <h3 className="text-base font-bold text-white">Bảng xếp hạng đầy đủ</h3>
            </div>
            <span className="text-xs text-foreground-muted">
              {leaderboard.length} phim yêu thích
            </span>
          </div>

          {leaderboard.length === 0 ? (
            <div className="my-8 text-center space-y-2">
              <Heart className="h-8 w-8 text-foreground-muted mx-auto" />
              <p className="text-xs text-foreground-muted">
                Bấm nút Yêu thích (❤️) ở các bộ phim bạn thích để đưa phim lên Bảng Xếp Hạng nhé!
              </p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-white/6 max-h-[520px] overflow-y-auto pr-1">
              {leaderboard.map((item, idx) => (
                <div
                  key={item.movie_slug}
                  className="flex items-center gap-3 py-3 transition-colors hover:bg-white/[0.02]"
                >
                  <span
                    className={`flex h-6 w-6 flex-none items-center justify-center rounded-lg text-[11px] font-black ${
                      idx < 3 ? "bg-primary text-white" : "bg-white/10 text-foreground-muted"
                    }`}
                  >
                    #{idx + 1}
                  </span>

                  <div className="relative aspect-[2/3] w-10 flex-none overflow-hidden rounded-md bg-black/60">
                    <Image
                      src={getImageUrl(item.poster_url || "")}
                      alt={item.movie_title}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/phim/${item.movie_slug}`}
                      className="line-clamp-1 text-xs font-bold text-white transition-colors hover:text-primary"
                    >
                      {item.movie_title}
                    </Link>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-foreground-muted">
                      <span className="flex items-center gap-1 text-error font-semibold">
                        <Heart className="h-3 w-3 fill-error" />
                        {item.like_count}
                      </span>
                      <span>•</span>
                      <span className="line-clamp-1">
                        {item.likers.join(", ")}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/phim/${item.movie_slug}`}
                    className="button-secondary min-h-7 px-2.5 text-[11px] flex-none"
                  >
                    Xem
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Interactive Comments Feed */}
        <section className="surface-panel p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h3 className="text-base font-bold text-white">Góc Thảo Luận Mới Nhất</h3>
            </div>
            <span className="text-xs text-foreground-muted">
              {comments.length} chủ đề
            </span>
          </div>

          {comments.length === 0 ? (
            <div className="my-8 text-center space-y-2">
              <MessageSquare className="h-8 w-8 text-foreground-muted mx-auto" />
              <p className="text-xs text-foreground-muted">
                Chưa có bình luận nào. Vào trang phim bất kỳ để bắt đầu trò chuyện!
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3.5 max-h-[520px] overflow-y-auto pr-1">
              {comments.map((cmt) => (
                <div key={cmt.id} className="space-y-2">
                  {/* Root Comment */}
                  <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3.5 transition-colors hover:bg-white/[0.04]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                          {cmt.author_name ? cmt.author_name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <span className="text-xs font-bold text-white">
                          {cmt.author_name}
                        </span>
                      </div>
                      <span className="text-[10px] text-foreground-muted">
                        {formatRelativeTime(cmt.created_at)}
                      </span>
                    </div>

                    <Link
                      href={`/phim/${cmt.movie_slug}`}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary/90 hover:underline"
                    >
                      <Film className="h-3 w-3" />
                      <span className="line-clamp-1">{cmt.movie_title}</span>
                    </Link>

                    <div className="mt-1.5 text-xs text-foreground-secondary leading-relaxed">
                      <CommentContent content={cmt.content} />
                    </div>

                    {/* Actions */}
                    <div className="mt-2.5 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => startReply(cmt.id, cmt.author_name)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary/80 hover:text-primary"
                      >
                        <Reply className="h-3 w-3" />
                        Trả lời
                      </button>

                      {cmt.is_owner && (
                        <button
                          type="button"
                          onClick={() => handleDelete(cmt.id, cmt.movie_slug)}
                          className="inline-flex items-center gap-1 text-[11px] text-foreground-muted hover:text-error"
                        >
                          <Trash2 className="h-3 w-3" />
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Reply Box directly below parent comment */}
                  {activeReplyId === cmt.id && (
                    <div className="ml-5 sm:ml-8 rounded-xl border border-primary/30 bg-primary/[0.03] p-2.5 shadow-md">
                      <MentionTextarea
                        value={replyContent}
                        onChange={setReplyContent}
                        onSubmit={() => handleReplySubmit(cmt)}
                        onCancel={() => {
                          setActiveReplyId(null);
                          setReplyContent("");
                        }}
                        placeholder={`Trả lời cho ${cmt.author_name} trong phim ${cmt.movie_title}...`}
                        submitLabel="Gửi trả lời"
                        isPending={isPending}
                        accounts={accounts}
                        rows={2}
                        autoFocus
                      />
                    </div>
                  )}

                  {/* Nested Replies (Threaded) */}
                  {cmt.replies && cmt.replies.length > 0 && (
                    <div className="ml-5 sm:ml-8 space-y-1.5 border-l-2 border-primary/20 pl-3">
                      {cmt.replies.map((reply) => (
                        <div key={reply.id} className="space-y-1.5">
                          <div className="rounded-lg border border-white/5 bg-white/[0.015] p-2.5 transition-colors hover:bg-white/[0.03]">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-white">
                                {reply.author_name}
                              </span>
                              <span className="text-[10px] text-foreground-muted">
                                {formatRelativeTime(reply.created_at)}
                              </span>
                            </div>

                            <div className="mt-1 text-[11px] text-foreground-secondary leading-relaxed">
                              <CommentContent content={reply.content} />
                            </div>

                            <div className="mt-1.5 flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => startReply(reply.id, reply.author_name)}
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-primary/80 hover:text-primary"
                              >
                                <Reply className="h-2.5 w-2.5" />
                                Trả lời
                              </button>

                              {reply.is_owner && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(reply.id, cmt.movie_slug)}
                                  className="inline-flex items-center gap-1 text-[10px] text-foreground-muted hover:text-error"
                                >
                                  <Trash2 className="h-2.5 w-2.5" />
                                  Xóa
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Inline Reply Box below reply */}
                          {activeReplyId === reply.id && (
                            <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-2.5 shadow-md">
                              <MentionTextarea
                                value={replyContent}
                                onChange={setReplyContent}
                                onSubmit={() => handleReplySubmit(cmt)}
                                onCancel={() => {
                                  setActiveReplyId(null);
                                  setReplyContent("");
                                }}
                                placeholder={`Trả lời cho ${reply.author_name}...`}
                                submitLabel="Gửi trả lời"
                                isPending={isPending}
                                accounts={accounts}
                                rows={2}
                                autoFocus
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
