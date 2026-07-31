"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { getMoviesByType } from "@/lib/api/unified";
import MovieGrid from "@/components/movie/MovieGrid";
import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { MovieGridSkeleton } from "@/components/ui/Skeleton";
import { useMovieData } from "@/lib/hooks/use-movie-data";
import { Film, RefreshCw } from "lucide-react";

const typeNames: Record<string, string> = {
    "phim-moi": "Phim Mới",
    "phim-bo": "Phim Bộ",
    "phim-le": "Phim Lẻ",
    "tv-shows": "TV Shows",
    "hoat-hinh": "Hoạt Hình",
    "phim-vietsub": "Phim Vietsub",
    "phim-thuyet-minh": "Phim Thuyết Minh",
    "phim-long-tieng": "Phim Lồng Tiếng",
    "phim-bo-dang-chieu": "Phim Bộ Đang Chiếu",
    "phim-bo-hoan-thanh": "Phim Bộ Hoàn Thành",
    "phim-sap-chieu": "Phim Sắp Chiếu",
    "phim-chieu-rap": "Phim Chiếu Rạp",
    "subteam": "Subteam",
};

interface Props {
    params: Promise<{ type: string }>;
    searchParams: Promise<{ page?: string }>;
}

export default function MovieListPage({ params, searchParams }: Props) {
    const { type } = use(params);
    const { page } = use(searchParams);
    const currentPage = parseInt(page || "1", 10);

    const { data, loading, error } = useMovieData(
        `list-${type}-p${currentPage}`,
        () => getMoviesByType(type, currentPage)
    );

    if (loading) {
        return (
            <div className="page-shell">
                <div className="skeleton mb-10 h-14 w-64 rounded-xl" />
                <MovieGridSkeleton />
            </div>
        );
    }

    if (!typeNames[type]) {
        notFound();
    }

    const movies = data?.data?.items || [];
    const pagination = data?.data?.params?.pagination || {};
    const totalItems = pagination.totalItems || movies.length;
    const totalPages = Math.ceil(totalItems / 24) || 1;

    return (
        <div className="page-shell">
            <PageHeader
                eyebrow="Danh sách phim"
                title={typeNames[type]}
                description="Khám phá những tựa phim được cập nhật từ nguồn bạn đang chọn."
                meta={totalItems > 0 ? `${totalItems.toLocaleString()} phim` : undefined}
            />

            {error ? (
                <EmptyState
                    icon={<RefreshCw className="h-5 w-5" />}
                    title="Không thể tải danh sách phim"
                    description="Kết nối tới nguồn phim đang gặp gián đoạn. Bạn có thể thử tải lại trang."
                    action={
                        <button type="button" onClick={() => window.location.reload()} className="button-secondary">
                            Thử lại
                        </button>
                    }
                />
            ) : movies.length > 0 ? (
                <>
                    <MovieGrid movies={movies} />
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        baseUrl={`/danh-sach/${type}`}
                    />
                </>
            ) : (
                <EmptyState
                    icon={<Film className="h-5 w-5" />}
                    title="Chưa có phim trong danh sách này"
                    description="Nội dung có thể đang được cập nhật. Hãy quay lại sau."
                />
            )}
        </div>
    );
}
