"use client";

import { useEffect, useRef, useState } from "react";
import MovieSlider from "@/components/movie/MovieSlider";
import { MovieSliderSkeleton } from "@/components/ui/Skeleton";
import { getMoviesByType } from "@/lib/api/unified";
import { extractMovieItems } from "@/lib/api/ophim";
import type { Movie } from "@/types/movie";

interface LazyMovieSectionProps {
  title: string;
  type: string;
  href: string;
}

export default function LazyMovieSection({ title, type, href }: LazyMovieSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTriggeredRef = useRef(false);
  const [movies, setMovies] = useState<Movie[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (hasTriggeredRef.current) return;

    const target = containerRef.current;
    if (!target) return;

    const controller = new AbortController();

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !hasTriggeredRef.current) {
          hasTriggeredRef.current = true;
          observer.disconnect();

          setLoading(true);
          getMoviesByType(type, 1)
            .then((res: any) => {
              if (controller.signal.aborted) return;
              const fetchedItems = extractMovieItems(res);
              setMovies(fetchedItems);
              setHasError(false);
            })
            .catch((_err) => {
              if (controller.signal.aborted) return;
              setMovies([]);
              setHasError(true);
            })
            .finally(() => {
              if (!controller.signal.aborted) {
                setLoading(false);
              }
            });
        }
      },
      { rootMargin: "100px" }
    );

    observer.observe(target);

    return () => {
      controller.abort();
      observer.disconnect();
    };
  }, [type]);

  // Hide section if loading failed, or if section has fewer than 2 movies (e.g. 0 or 1 item)
  if (!loading && (hasError || (movies !== null && movies.length < 2))) {
    return null;
  }

  if (loading) {
    return (
      <div ref={containerRef} className="py-7 md:py-8 lg:py-9">
        <div className="skeleton mb-5 h-7 w-44 rounded-md" />
        <MovieSliderSkeleton />
      </div>
    );
  }

  if (!movies || movies.length === 0) {
    return <div ref={containerRef} />;
  }

  return (
    <div ref={containerRef}>
      <MovieSlider title={title} movies={movies.slice(0, 12)} href={href} />
    </div>
  );
}
