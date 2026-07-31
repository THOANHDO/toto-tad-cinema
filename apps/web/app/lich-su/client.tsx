"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Compass, History, Info, Play, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { getImageUrl } from "@/lib/api/ophim";
import { useProfileStore } from "@/lib/store/useProfileStore";
import { clearHistory, getWatchHistory } from "./actions";

interface HistoryItem {
    movie_slug: string;
    movie_title: string;
    poster_url: string;
    episode_slug: string;
    episode_name: string;
    duration: number;
    playback_time: number;
    updated_at: string;
}

export default function HistoryClient({ initialHistory }: { initialHistory: HistoryItem[] }) {
    const { currentProfile, setWatchHistory, setWatchProgress } = useProfileStore();
    const [history, setHistory] = useState(initialHistory);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        if (currentProfile?.id) {
            getWatchHistory(currentProfile.id).then((data) => {
                setHistory(data as any);

                const progress: Record<string, any> = {};
                data?.forEach((item: any) => {
                    progress[item.movie_slug] = {
                        episode: item.episode_slug,
                        episodeName: item.episode_name,
                        currentTime: item.playback_time,
                        duration: item.duration,
                        updatedAt: new Date(item.updated_at).getTime(),
                    };
                });
                setWatchProgress(progress);
            });
        }
    }, [currentProfile?.id, setWatchProgress]);

    const handleClearAll = async () => {
        if (!currentProfile?.id) return;
        setIsPending(true);
        const result = await clearHistory(currentProfile.id);
        if (result.success) {
            setHistory([]);
            setWatchHistory([]);
            setWatchProgress({});
        }
        setShowConfirm(false);
        setIsPending(false);
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 1) return "Vừa xem";
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        return date.toLocaleDateString("vi-VN");
    };

    return (
        <div className="page-shell">
            <PageHeader
                eyebrow="Xem tiếp"
                title="Lịch sử xem"
                description="Tiếp tục từ đúng tập và thời điểm bạn đã dừng lại."
                meta={history.length > 0 ? `${history.length} phim` : undefined}
                actions={history.length > 0 ? (
                    <button
                        type="button"
                        onClick={() => setShowConfirm(true)}
                        className="button-ghost text-error hover:border-error/30 hover:text-error"
                    >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Xóa tất cả</span>
                    </button>
                ) : undefined}
            />

            <div className="mb-8 flex items-start gap-3 rounded-[var(--radius-lg)] border border-border bg-background-secondary/70 p-4 text-xs leading-6 text-foreground-secondary md:text-sm">
                <Info className="mt-0.5 h-5 w-5 flex-none text-primary" />
                <div>
                    <p className="font-semibold text-foreground">Tiến độ theo profile</p>
                    <p>Playback time và tập gần nhất được lưu riêng cho profile hiện tại.</p>
                </div>
            </div>

            {history.length > 0 ? (
                <div className="grid gap-4">
                    {history.map((item, index) => {
                        const progressPercent = item.duration > 0
                            ? (item.playback_time / item.duration) * 100
                            : 0;
                        const resumeHref = `/xem-phim/${item.movie_slug}/${item.episode_slug}${item.playback_time > 0 ? `?t=${item.playback_time}` : ""}`;

                        return (
                            <motion.article
                                key={`${item.movie_slug}-${item.updated_at}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(index, 6) * 0.04 }}
                                className="group grid grid-cols-[7rem_minmax(0,1fr)] gap-4 rounded-[var(--radius-xl)] border border-border bg-background-secondary/70 p-3 transition-colors hover:border-border-strong hover:bg-background-secondary sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-center sm:p-4 md:grid-cols-[10rem_minmax(0,1fr)] lg:grid-cols-[12rem_minmax(0,1fr)_auto] xl:grid-cols-[10rem_minmax(0,1fr)_auto]"
                            >
                                <Link
                                    href={resumeHref}
                                    prefetch={false}
                                    className="relative aspect-video overflow-hidden rounded-[var(--radius-md)] bg-background-tertiary"
                                    aria-label={`Tiếp tục xem ${item.movie_title}`}
                                >
                                    {item.poster_url ? (
                                        <Image
                                            src={getImageUrl(item.poster_url)}
                                            alt={item.movie_title}
                                            fill
                                            sizes="(max-width: 640px) 112px, (max-width: 1023px) 160px, (max-width: 1279px) 192px, 160px"
                                            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 skeleton" />
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-xl">
                                            <Play className="ml-0.5 h-4 w-4 fill-current" />
                                        </span>
                                    </div>
                                    {item.duration > 0 && (
                                        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                                            <div className="h-full bg-primary" style={{ width: `${progressPercent}%` }} />
                                        </div>
                                    )}
                                </Link>

                                <div className="min-w-0">
                                    <Link
                                        href={`/phim/${item.movie_slug}`}
                                        prefetch={false}
                                        className="line-clamp-1 text-sm font-semibold text-white transition-colors hover:text-primary sm:text-base"
                                    >
                                        {item.movie_title}
                                    </Link>
                                    <p className="mt-1 line-clamp-1 text-xs text-foreground-secondary sm:text-sm">
                                        {item.episode_name}
                                    </p>
                                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-foreground-muted sm:text-xs">
                                        <Clock className="h-3 w-3" />
                                        {formatTime(item.updated_at)}
                                    </div>
                                    <Link
                                        href={resumeHref}
                                        prefetch={false}
                                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary sm:hidden md:inline-flex lg:hidden"
                                    >
                                        <Play className="h-3.5 w-3.5 fill-current" />
                                        Tiếp tục xem
                                    </Link>
                                </div>

                                <Link
                                    href={resumeHref}
                                    prefetch={false}
                                    className="button-primary hidden sm:inline-flex md:hidden lg:inline-flex"
                                >
                                    <Play className="h-4 w-4 fill-current" />
                                    Tiếp tục xem
                                </Link>
                            </motion.article>
                        );
                    })}
                </div>
            ) : (
                <EmptyState
                    icon={<History className="h-5 w-5" />}
                    title="Chưa có lịch sử xem"
                    description="Khi bạn bắt đầu xem phim, tập gần nhất và tiến độ sẽ xuất hiện tại đây."
                    action={
                        <Link href="/" prefetch={false} className="button-primary">
                            <Compass className="h-4 w-4" />
                            Khám phá phim
                        </Link>
                    }
                />
            )}

            <ConfirmDialog
                isOpen={showConfirm}
                title="Xóa toàn bộ lịch sử?"
                description="Tất cả tiến độ xem của profile này sẽ bị xóa và không thể khôi phục."
                confirmLabel="Xóa lịch sử"
                isPending={isPending}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleClearAll}
            />
        </div>
    );
}
