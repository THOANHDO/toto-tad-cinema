"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, Heart, Info, Trash2 } from "lucide-react";
import MovieGrid from "@/components/movie/MovieGrid";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { useAccountDataStore } from "@/lib/store/useAccountDataStore";
import type { Movie } from "@/types/movie";
import { clearAllFavorites } from "./actions";

interface Favorite {
    movie_slug: string;
    movie_title: string;
    poster_url: string;
}

export default function FavoritesClient({ initialFavorites }: { initialFavorites: Favorite[] }) {
    const { favoriteSlugs, setFavoriteSlugs } = useAccountDataStore();
    const [favorites, setFavorites] = useState(initialFavorites);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        setFavoriteSlugs(initialFavorites.map((favorite) => favorite.movie_slug));
    }, [initialFavorites, setFavoriteSlugs]);

    const handleClearAll = async () => {
        setIsPending(true);
        const result = await clearAllFavorites();
        if (result.success) {
            setFavorites([]);
            setFavoriteSlugs([]);
        }
        setShowConfirm(false);
        setIsPending(false);
    };

    const movies: Movie[] = favorites
        .filter((favorite) => favoriteSlugs.includes(favorite.movie_slug))
        .map((favorite) => ({
            _id: favorite.movie_slug,
            slug: favorite.movie_slug,
            name: favorite.movie_title,
            thumb_url: favorite.poster_url,
            poster_url: favorite.poster_url,
            origin_name: "",
            type: "single" as const,
            sub_docquyen: false,
            chipiuliui: false,
            time: "",
            episode_current: "",
            quality: "",
            lang: "",
            year: 0,
            category: [],
            country: [],
        }));

    return (
        <div className="page-shell">
            <PageHeader
                eyebrow="Thư viện của bạn"
                title="Phim yêu thích"
                description="Những bộ phim bạn đã lưu để quay lại bất cứ lúc nào."
                meta={favorites.length > 0 ? `${favorites.length} phim` : undefined}
                actions={favorites.length > 0 ? (
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
                    <p className="font-semibold text-foreground">Đồng bộ theo tài khoản</p>
                    <p>Danh sách này được lưu riêng cho tài khoản đang đăng nhập và đồng bộ giữa các thiết bị.</p>
                </div>
            </div>

            {favorites.length > 0 ? (
                <MovieGrid movies={movies} showProgress={false} />
            ) : (
                <EmptyState
                    icon={<Heart className="h-5 w-5" />}
                    title="Chưa có phim yêu thích"
                    description="Nhấn biểu tượng trái tim trên một bộ phim để lưu vào thư viện riêng của bạn."
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
                title="Xóa toàn bộ phim yêu thích?"
                description={`Bạn sắp xóa ${favorites.length} phim khỏi thư viện của tài khoản này. Hành động này không thể hoàn tác.`}
                confirmLabel="Xóa tất cả"
                isPending={isPending}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleClearAll}
            />
        </div>
    );
}
