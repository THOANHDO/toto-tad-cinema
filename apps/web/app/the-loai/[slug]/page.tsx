"use client";

import { use } from "react";
import { getMoviesByGenre } from "@/lib/api/unified";
import MovieGrid from "@/components/movie/MovieGrid";
import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { MovieGridSkeleton } from "@/components/ui/Skeleton";
import { useMovieData } from "@/lib/hooks/use-movie-data";
import { Clapperboard, RefreshCw } from "lucide-react";

interface Props {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ page?: string }>;
}

export default function GenrePage({ params, searchParams }: Props) {
    const { slug } = use(params);
    const { page } = use(searchParams);
    const currentPage = parseInt(page || "1", 10);

    const { data, loading, error } = useMovieData(
        `genre-${slug}-p${currentPage}`,
        () => getMoviesByGenre(slug, currentPage)
    );

    if (loading) {
        return (
            <div className="page-shell">
                <div className="skeleton mb-10 h-14 w-72 rounded-xl" />
                <MovieGridSkeleton />
            </div>
        );
    }

    const movies = data?.data?.items || [];
    const pagination = data?.data?.params?.pagination || {};
    const totalItems = pagination.totalItems || movies.length;
    const totalPages = Math.ceil(totalItems / 24) || 1;
    const title = data?.data?.titlePage || `Thể loại: ${slug.replace(/-/g, " ")}`;

    return (
        <div className="page-shell">
            <PageHeader
                eyebrow="Thể loại"
                title={title}
                description="Tìm phim theo sắc thái và câu chuyện bạn muốn thưởng thức hôm nay."
                meta={totalItems > 0 ? `${totalItems.toLocaleString()} phim` : undefined}
            />

            {error ? (
                <EmptyState
                    icon={<RefreshCw className="h-5 w-5" />}
                    title="Không thể tải thể loại"
                    description="Nguồn phim chưa phản hồi. Vui lòng thử lại."
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
                        baseUrl={`/the-loai/${slug}`}
                    />
                </>
            ) : (
                <EmptyState
                    icon={<Clapperboard className="h-5 w-5" />}
                    title="Chưa có phim trong thể loại này"
                    description="Hãy thử một thể loại khác hoặc quay lại khi nội dung được cập nhật."
                />
            )}
        </div>
    );
}
