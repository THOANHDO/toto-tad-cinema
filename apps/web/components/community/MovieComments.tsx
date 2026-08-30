"use client";

import { useEffect, useState, useTransition } from "react";
import { MessageSquare, Send, Trash2, Smile, Reply, X, CornerDownRight } from "lucide-react";
import {
  postMovieComment,
  deleteMovieComment,
  getMovieComments,
  type CommunityCommentItem,
} from "@/app/bang-xep-hang/actions";

interface MovieCommentsProps {
  movieSlug: string;
  movieTitle: string;
  posterUrl?: string | null;
  episodeName?: string | null;
  initialComments?: CommunityCommentItem[];
}

const QUICK_EMOJIS = ["❤️", "🔥", "🤣", "🍿", "👏", "😭", "👍", "✨"];

export default function MovieComments({
  movieSlug,
  movieTitle,
  posterUrl,
  episodeName,
  initialComments = [],
}: MovieCommentsProps) {
  const [comments, setComments] = useState<CommunityCommentItem[]>(initialComments);
  const [content, setContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Load comments on mount or slug change
  const refreshComments = async () => {
    if (!movieSlug) return;
    try {
      const data = await getMovieComments(movieSlug);
      setComments(data);
    } catch (err) {
      console.error("Lỗi khi tải bình luận:", err);
    }
  };

  useEffect(() => {
    if (initialComments && initialComments.length > 0) {
      setComments(initialComments);
    }
    refreshComments();
  }, [movieSlug]);

  const handleEmojiClick = (emoji: string) => {
    setContent((prev) => prev + emoji);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;

    setErrorMsg("");
    startTransition(async () => {
      const res = await postMovieComment({
        movie_slug: movieSlug,
        movie_title: movieTitle,
        poster_url: posterUrl,
        episode_name: episodeName,
        parent_id: replyingTo?.id || null,
        content: text,
      });

      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setContent("");
        setReplyingTo(null);
        await refreshComments();
      }
    });
  };

  const handleDelete = (commentId: string) => {
    startTransition(async () => {
      const res = await deleteMovieComment(commentId, movieSlug);
      if (!res?.error) {
        await refreshComments();
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

  const totalCommentCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length || 0),
    0
  );

  return (
    <section className="surface-panel p-5 sm:p-7">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white sm:text-lg">
              Bình luận gia đình & bạn bè
            </h3>
            <p className="text-xs text-foreground-muted">
              {totalCommentCount > 0
                ? `${totalCommentCount} bình luận và trao đổi về phim này`
                : "Chưa có bình luận nào, hãy là người đầu tiên chia sẻ cảm nghĩ!"}
            </p>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        {/* Reply Indicator */}
        {replyingTo && (
          <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs text-primary">
            <span className="flex items-center gap-1.5 font-medium">
              <CornerDownRight className="h-3.5 w-3.5" />
              Đang trả lời <strong>@{replyingTo.name}</strong>
            </span>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="hover:opacity-80 p-0.5"
              title="Hủy trả lời"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              replyingTo
                ? `Nhập câu trả lời cho @${replyingTo.name}...`
                : `Bạn thấy bộ phim này thế nào? Chia sẻ cùng mọi người nhé...`
            }
            rows={replyingTo ? 2 : 3}
            maxLength={500}
            className="w-full resize-none rounded-xl border border-white/10 bg-black/40 p-3.5 text-sm text-white placeholder-white/35 backdrop-blur-sm transition-all focus:border-primary/60 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-primary/60"
          />
        </div>

        {/* Emoji Bar & Submit Button */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-xs text-foreground-muted mr-1">
              <Smile className="h-3.5 w-3.5" /> Emoji:
            </span>
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-sm transition-colors hover:bg-white/15 hover:scale-110 active:scale-95"
              >
                {emoji}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={isPending || !content.trim()}
            className="button-primary min-h-9 gap-1.5 px-4 text-xs font-semibold disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {isPending ? "Đang gửi..." : replyingTo ? "Gửi trả lời" : "Bình luận"}
          </button>
        </div>

        {errorMsg && <p className="text-xs text-error">{errorMsg}</p>}
      </form>

      {/* Comment List */}
      <div className="mt-6 space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="space-y-2.5">
            {/* Top-Level Comment */}
            <div className="group relative flex items-start gap-3 rounded-xl border border-white/6 bg-white/[0.02] p-3.5 transition-colors hover:bg-white/[0.04]">
              {/* Avatar Initials */}
              <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br from-primary/40 to-primary/90 text-xs font-bold text-white shadow-sm ring-1 ring-white/20">
                {comment.author_name ? comment.author_name.charAt(0).toUpperCase() : "U"}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      {comment.author_name}
                    </span>
                    {comment.episode_name && (
                      <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        {comment.episode_name}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-foreground-muted">
                    {formatRelativeTime(comment.created_at)}
                  </span>
                </div>

                <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-foreground-secondary leading-relaxed">
                  {comment.content}
                </p>

                {/* Reply Action */}
                <div className="mt-2.5 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo({ id: comment.id, name: comment.author_name });
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary/80 transition-colors hover:text-primary"
                  >
                    <Reply className="h-3 w-3" />
                    Trả lời
                  </button>

                  {comment.is_owner && (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      className="inline-flex items-center gap-1 text-xs text-foreground-muted transition-colors hover:text-error"
                    >
                      <Trash2 className="h-3 w-3" />
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Nested Replies (Thread) */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="ml-6 sm:ml-10 space-y-2 border-l-2 border-primary/20 pl-3 sm:pl-4">
                {comment.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className="group relative flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.015] p-3 transition-colors hover:bg-white/[0.03]"
                  >
                    <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/40 to-primary/70 text-[10px] font-bold text-white shadow-sm ring-1 ring-white/20">
                      {reply.author_name ? reply.author_name.charAt(0).toUpperCase() : "U"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">
                            {reply.author_name}
                          </span>
                          {reply.reply_to_name && (
                            <span className="text-[11px] text-foreground-muted">
                              trả lời <strong className="text-primary/90 font-semibold">@{reply.reply_to_name}</strong>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-foreground-muted">
                          {formatRelativeTime(reply.created_at)}
                        </span>
                      </div>

                      <p className="mt-1 whitespace-pre-wrap break-words text-xs text-foreground-secondary leading-relaxed">
                        {reply.content}
                      </p>

                      <div className="mt-2 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingTo({ id: comment.id, name: reply.author_name });
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary/80 hover:text-primary"
                        >
                          <Reply className="h-2.5 w-2.5" />
                          Trả lời
                        </button>

                        {reply.is_owner && (
                          <button
                            type="button"
                            onClick={() => handleDelete(reply.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-foreground-muted hover:text-error"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
