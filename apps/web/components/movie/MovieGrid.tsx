"use client";

import MovieCard from "./MovieCard";
import type { Movie } from "@/types/movie";

interface MovieGridProps {
    movies: Movie[];
    showProgress?: boolean;
}

export default function MovieGrid({ movies, showProgress = true }: MovieGridProps) {
    if (!movies || movies.length === 0) {
        return (
            <div className="empty-state">
                <p className="empty-state__title">Chưa có phim để hiển thị</p>
                <p className="empty-state__description">
                    Nội dung có thể đang được cập nhật. Hãy thử lại sau.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-x-3 gap-y-7 min-[520px]:grid-cols-3 sm:gap-x-4 md:grid-cols-3 md:gap-x-4 lg:grid-cols-4 xl:grid-cols-6 xl:gap-x-6">
            {movies.map((movie, index) => (
                <MovieCard
                    key={movie._id || movie.slug}
                    movie={movie}
                    index={index}
                    showProgress={showProgress}
                />
            ))}
        </div>
    );
}
