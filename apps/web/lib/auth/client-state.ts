"use client";

import { useAccountDataStore } from "@/lib/store/useAccountDataStore";
import { type MovieSource, useStore } from "@/lib/store/useStore";

const LEGACY_PROFILE_STORAGE_KEY = "sr-profile-storage";
const LEGACY_APP_STORAGE_KEY = "silent-ride-storage";
const MOVIE_SOURCES = new Set<MovieSource>(["ophim", "nguonc", "kkphim"]);

/**
 * Removes viewing-profile and private movie data left by the former localStorage
 * implementation. The unrelated movie-source preference is migrated first.
 */
export function clearLegacyViewingProfileState() {
  if (typeof window === "undefined") return;

  try {
    const legacyValue = window.localStorage.getItem(LEGACY_APP_STORAGE_KEY);
    if (legacyValue) {
      const parsed = JSON.parse(legacyValue) as {
        state?: { movieSource?: MovieSource };
      };
      const legacyMovieSource = parsed.state?.movieSource;
      if (legacyMovieSource && MOVIE_SOURCES.has(legacyMovieSource)) {
        useStore.getState().setMovieSource(legacyMovieSource);
      }
    }
  } catch {
    // Invalid legacy state is safe to discard.
  }

  window.localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_APP_STORAGE_KEY);
}

/** Clears in-memory private state without removing UI preferences. */
export function clearUserScopedState() {
  useAccountDataStore.getState().resetAccountData();
  clearLegacyViewingProfileState();
}
