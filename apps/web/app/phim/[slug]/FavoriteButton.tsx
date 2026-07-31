"use client";

import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useProfileStore } from "@/lib/store/useProfileStore";
import { toggleFavorite } from "@/app/yeu-thich/actions";
import type { MovieDetail } from "@/types/movie";

interface FavoriteButtonProps {
    movie: MovieDetail;
}

export default function FavoriteButton({ movie }: FavoriteButtonProps) {
    const { currentProfile, favoriteSlugs, toggleFavoriteSlug } = useProfileStore();
    const isSupabaseEnabled = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    if (!isSupabaseEnabled) return null;

    const isLiked = favoriteSlugs.includes(movie.slug);

    const handleClick = async () => {
        if (!currentProfile?.id) {
            console.warn('Vui lòng chọn Profile để thực hiện tính năng này');
            return;
        }

        // Toggle local state for immediate feedback
        toggleFavoriteSlug(movie.slug);

        // Sync with Supabase
        const result = await toggleFavorite(currentProfile.id, {
            movie_slug: movie.slug,
            movie_title: movie.name,
            poster_url: movie.thumb_url
        });
        
        if (result && 'error' in result) {
            console.error('Lỗi khi lưu phim yêu thích:', result.error);
            // Rollback local state on error
            toggleFavoriteSlug(movie.slug);
        }
    };

    return (
        <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={handleClick}
            className={`button-secondary min-w-36 ${isLiked
                    ? "border-primary/60 bg-primary/18 text-primary"
                    : ""
                }`}
            aria-pressed={isLiked}
        >
            <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
            {isLiked ? "Đã thích" : "Yêu thích"}
        </motion.button>
    );
}
