import { create } from "zustand";

export interface WatchProgressItem {
  episode: string;
  episodeName: string;
  currentTime: number;
  duration: number;
  updatedAt: number;
}

export interface AccountWatchHistoryItem {
  movie_slug: string;
  movie_title: string | null;
  poster_url: string | null;
  episode_slug: string | null;
  episode_name: string | null;
  duration: number | null;
  playback_time: number | null;
  updated_at: string;
}

interface AccountDataState {
  favoriteSlugs: string[];
  watchHistory: AccountWatchHistoryItem[];
  watchProgress: Record<string, WatchProgressItem>;
  setFavoriteSlugs: (slugs: string[]) => void;
  toggleFavoriteSlug: (slug: string) => void;
  setWatchHistory: (history: AccountWatchHistoryItem[]) => void;
  setWatchProgress: (progress: Record<string, WatchProgressItem>) => void;
  updateWatchProgress: (slug: string, progress: WatchProgressItem) => void;
  resetAccountData: () => void;
}

const EMPTY_ACCOUNT_DATA = {
  favoriteSlugs: [],
  watchHistory: [],
  watchProgress: {},
};

export const useAccountDataStore = create<AccountDataState>()((set) => ({
  ...EMPTY_ACCOUNT_DATA,
  setFavoriteSlugs: (favoriteSlugs) => set({ favoriteSlugs }),
  toggleFavoriteSlug: (slug) =>
    set((state) => ({
      favoriteSlugs: state.favoriteSlugs.includes(slug)
        ? state.favoriteSlugs.filter((item) => item !== slug)
        : [...state.favoriteSlugs, slug],
    })),
  setWatchHistory: (watchHistory) => set({ watchHistory: watchHistory.slice(0, 50) }),
  setWatchProgress: (watchProgress) => set({ watchProgress }),
  updateWatchProgress: (slug, progress) =>
    set((state) => ({
      watchProgress: { ...state.watchProgress, [slug]: progress },
    })),
  resetAccountData: () => set(EMPTY_ACCOUNT_DATA),
}));
