"use client";

import { useState, useTransition } from "react";
import { MessageSquare, Send, Trash2, Heart, Smile } from "lucide-react";
import { postMovieComment, deleteMovieComment, type CommunityCommentItem } from "@/app/bang-xep-hang/actions";
import Image from "next/image";

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
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

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
        content: text,
      });

      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setContent("");
        // Optimistically add to UI list
        const newComment: CommunityCommentItem = {
          id: `temp-${Date.now()}`,
          user_id: "me",
          author_name: "Bạn",
          movie_slug: movieSlug,
          movie_title: movieTitle,
          poster_url: posterUrl || null,
          episode_name: episodeName || null,
          content: text,
          created_at: new Date().toISOString(),
          is_owner: true,
        };
        setComments((prev) => [newComment, ...prev]);
      }
    });
  };

  const handleDelete = (commentId: string) => {
    startTransition(async () => {
      const res = await deleteMovieComment(commentId, movieSlug);
      if (!res?.error) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
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
              {comments.length > 0
                ? `${comments.length} bình luận về phim này`
                : "Chưa có bình luận nào, hãy là người đầu tiên chia sẻ cảm nghĩ!"}
            </p>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Bạn thấy bộ phim này thế nào? Chia sẻ cùng mọi người nhé...`}
            rows={3}
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
            {isPending ? "Đang gửi..." : "Bình luận"}
          </button>
        </div>

        {errorMsg && (
          <p className="text-xs text-error">{errorMsg}</p>
        )}
      </form>

      {/* Comment List */}
      <div className="mt-6 space-y-3">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="group relative flex items-start gap-3 rounded-xl border border-white/6 bg-white/[0.02] p-3.5 transition-colors hover:bg-white/[0.04]"
          >
            {/* Avatar Initials */}
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/80 text-xs font-bold text-white shadow-sm ring-1 ring-white/20">
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
            </div>

            {/* Delete button for owner */}
            {comment.is_owner && (
              <button
                type="button"
                onClick={() => handleDelete(comment.id)}
                className="opacity-0 transition-opacity group-hover:opacity-100 p-1 text-foreground-muted hover:text-error"
                title="Xóa bình luận"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
