import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MovieSource = "ophim" | "nguonc" | "kkphim";

interface StoreState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  movieSource: MovieSource;
  setMovieSource: (source: MovieSource) => void;
}

/** Only non-private UI preferences are persisted in the browser. */
export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      movieSource: "ophim",
      setMovieSource: (movieSource) => set({ movieSource }),
    }),
    {
      name: "silent-ride-ui-storage",
      partialize: (state) => ({ movieSource: state.movieSource }),
    },
  ),
);
