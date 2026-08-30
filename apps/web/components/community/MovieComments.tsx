"use client";

import { useEffect, useState, useTransition } from "react";
import { MessageSquare, Trash2, Reply } from "lucide-react";
import {
  postMovieComment,
  deleteMovieComment,
  getMovieComments,
  getCommunityAccounts,
  type CommunityCommentItem,
  type CommunityAccount,
} from "@/app/bang-xep-hang/actions";
import MentionTextarea from "./MentionTextarea";
import CommentContent from "./CommentContent";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface MovieCommentsProps {
  movieSlug: string;
  movieTitle: string;
  posterUrl?: string | null;
  episodeName?: string | null;
  initialComments?: CommunityCommentItem[];
}

export default function MovieComments({
  movieSlug,
  movieTitle,
  posterUrl,
  episodeName,
  initialComments = [],
}: MovieCommentsProps) {
  const [comments, setComments] = useState<CommunityCommentItem[]>(initialComments);
  const [accounts, setAccounts] = useState<CommunityAccount[]>([]);
  const [mainContent, setMainContent] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

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
    getCommunityAccounts().then(setAccounts).catch(console.error);
  }, [movieSlug]);

  const handleMainSubmit = () => {
    const text = mainContent.trim();
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
        setMainContent("");
        await refreshComments();
      }
    });
  };

  const handleReplySubmit = (parentId: string) => {
    const text = replyContent.trim();
    if (!text) return;

    setErrorMsg("");
    startTransition(async () => {
      const res = await postMovieComment({
        movie_slug: movieSlug,
        movie_title: movieTitle,
        poster_url: posterUrl,
        episode_name: episodeName,
        parent_id: parentId,
        content: text,
      });

      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setReplyContent("");
        setActiveReplyId(null);
        await refreshComments();
      }
    });
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    const idToDelete = deleteTargetId;
    setDeleteTargetId(null);

    // Optimistic fast deletion (0ms latency for UI)
    const previousComments = [...comments];
    setComments((prev) =>
      prev
        .filter((c) => c.id !== idToDelete)
        .map((c) => ({
          ...c,
          replies: c.replies?.filter((r) => r.id !== idToDelete) || [],
        }))
    );

    try {
      const res = await deleteMovieComment(idToDelete, movieSlug);
      if (res?.error) {
        setComments(previousComments);
        setErrorMsg(res.error);
      }
    } catch (_err) {
      setComments(previousComments);
      setErrorMsg("Không thể xóa bình luận, vui lòng thử lại.");
    }
  };

  const startReply = (targetId: string, authorName: string) => {
    setActiveReplyId(targetId);
    setReplyContent(`@${authorName} `);
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

      {/* Main Top Input Form */}
      <div className="mt-5">
        <MentionTextarea
          value={mainContent}
          onChange={setMainContent}
          onSubmit={handleMainSubmit}
          placeholder="Bạn thấy bộ phim này thế nào? Chia sẻ cùng mọi người nhé (gõ @ để nhắc tên)..."
          submitLabel="Bình luận"
          isPending={isPending}
          accounts={accounts}
          rows={3}
        />
        {errorMsg && <p className="mt-2 text-xs text-error">{errorMsg}</p>}
      </div>

      {/* Comment List */}
      <div className="mt-6 space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="space-y-2.5">
            {/* Top-Level Comment */}
            <div className="group relative flex items-start gap-3 rounded-xl border border-white/6 bg-white/[0.02] p-3.5 transition-colors hover:bg-white/[0.04]">
              {/* Avatar */}
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

                <div className="mt-1.5 text-sm text-foreground-secondary leading-relaxed">
                  <CommentContent content={comment.content} />
                </div>

                {/* Actions */}
                <div className="mt-2.5 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => startReply(comment.id, comment.author_name)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary/80 transition-colors hover:text-primary"
                  >
                    <Reply className="h-3 w-3" />
                    Trả lời
                  </button>

                  {comment.is_owner && (
                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(comment.id)}
                      className="inline-flex items-center gap-1 text-xs text-foreground-muted transition-colors hover:text-error"
                    >
                      <Trash2 className="h-3 w-3" />
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Inline Reply Input directly below parent comment */}
            {activeReplyId === comment.id && (
              <div className="ml-6 sm:ml-10 rounded-xl border border-primary/30 bg-primary/[0.03] p-3 shadow-md">
                <MentionTextarea
                  value={replyContent}
                  onChange={setReplyContent}
                  onSubmit={() => handleReplySubmit(comment.id)}
                  onCancel={() => {
                    setActiveReplyId(null);
                    setReplyContent("");
                  }}
                  placeholder={`Nhập câu trả lời...`}
                  submitLabel="Gửi trả lời"
                  isPending={isPending}
                  accounts={accounts}
                  rows={2}
                  autoFocus
                />
              </div>
            )}

            {/* Nested Replies (Thread) */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="ml-6 sm:ml-10 space-y-2 border-l-2 border-primary/20 pl-3 sm:pl-4">
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="space-y-2">
                    <div className="group relative flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.015] p-3 transition-colors hover:bg-white/[0.03]">
                      <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/40 to-primary/70 text-[10px] font-bold text-white shadow-sm ring-1 ring-white/20">
                        {reply.author_name ? reply.author_name.charAt(0).toUpperCase() : "U"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white">
                            {reply.author_name}
                          </span>
                          <span className="text-[10px] text-foreground-muted">
                            {formatRelativeTime(reply.created_at)}
                          </span>
                        </div>

                        <div className="mt-1 text-xs text-foreground-secondary leading-relaxed">
                          <CommentContent content={reply.content} />
                        </div>

                        <div className="mt-2 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => startReply(reply.id, reply.author_name)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary/80 hover:text-primary"
                          >
                            <Reply className="h-2.5 w-2.5" />
                            Trả lời
                          </button>

                          {reply.is_owner && (
                            <button
                              type="button"
                              onClick={() => setDeleteTargetId(reply.id)}
                              className="inline-flex items-center gap-1 text-[11px] text-foreground-muted hover:text-error"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Inline Reply Input below reply */}
                    {activeReplyId === reply.id && (
                      <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-3 shadow-md">
                        <MentionTextarea
                          value={replyContent}
                          onChange={setReplyContent}
                          onSubmit={() => handleReplySubmit(comment.id)}
                          onCancel={() => {
                            setActiveReplyId(null);
                            setReplyContent("");
                          }}
                          placeholder={`Nhập câu trả lời...`}
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

      {/* Confirm Delete Popup */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        title="Xóa bình luận này?"
        description="Bình luận của bạn sẽ bị xóa khỏi bộ phim và không thể khôi phục."
        confirmLabel="Xóa bình luận"
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
