"use client";

import { use } from "react";
import { getMoviesByCountry } from "@/lib/api/unified";
import MovieGrid from "@/components/movie/MovieGrid";
import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { MovieGridSkeleton } from "@/components/ui/Skeleton";
import { useMovieData } from "@/lib/hooks/use-movie-data";
import { Globe2, RefreshCw } from "lucide-react";

interface Props {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ page?: string }>;
}

export default function CountryPage({ params, searchParams }: Props) {
    const { slug } = use(params);
    const { page } = use(searchParams);
    const currentPage = parseInt(page || "1", 10);

    const { data, loading, error } = useMovieData(
        `country-${slug}-p${currentPage}`,
        () => getMoviesByCountry(slug, currentPage)
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
    const title = data?.data?.titlePage || `Phim ${slug.replace(/-/g, " ")}`;

    return (
        <div className="page-shell">
            <PageHeader
                eyebrow="Điện ảnh thế giới"
                title={title}
                description="Khám phá phim và chương trình nổi bật theo quốc gia sản xuất."
                meta={totalItems > 0 ? `${totalItems.toLocaleString()} phim` : undefined}
            />

            {error ? (
                <EmptyState
                    icon={<RefreshCw className="h-5 w-5" />}
                    title="Không thể tải danh sách quốc gia"
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
                        baseUrl={`/quoc-gia/${slug}`}
                    />
                </>
            ) : (
                <EmptyState
                    icon={<Globe2 className="h-5 w-5" />}
                    title="Chưa có phim từ quốc gia này"
                    description="Hãy thử một quốc gia khác hoặc quay lại khi nội dung được cập nhật."
                />
            )}
        </div>
    );
}
