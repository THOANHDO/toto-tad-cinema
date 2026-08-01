"use client";

import { getWatchHistory } from "@/app/lich-su/actions";
import { getFavoriteSlugs } from "@/app/yeu-thich/actions";
import { clearLegacyViewingProfileState } from "@/lib/auth/client-state";
import {
  type WatchProgressItem,
  useAccountDataStore,
} from "@/lib/store/useAccountDataStore";
import { useEffect } from "react";

interface AccountDataHydratorProps {
  accountId: string | null;
  children: React.ReactNode;
}

export default function AccountDataHydrator({
  accountId,
  children,
}: AccountDataHydratorProps) {
  useEffect(() => {
    let cancelled = false;
    const store = useAccountDataStore.getState();

    clearLegacyViewingProfileState();
    store.resetAccountData();

    if (!accountId) return () => undefined;

    const hydrate = async () => {
      try {
        const [favoriteSlugs, watchHistory] = await Promise.all([
          getFavoriteSlugs(),
          getWatchHistory(),
        ]);

        if (cancelled) return;

        const watchProgress = watchHistory.reduce<Record<string, WatchProgressItem>>(
          (result, item) => {
            result[item.movie_slug] = {
              episode: item.episode_slug ?? "",
              episodeName: item.episode_name ?? "",
              currentTime: Number(item.playback_time ?? 0),
              duration: Number(item.duration ?? 0),
              updatedAt: new Date(item.updated_at).getTime(),
            };
            return result;
          },
          {},
        );

        store.setFavoriteSlugs(favoriteSlugs);
        store.setWatchHistory(watchHistory);
        store.setWatchProgress(watchProgress);
      } catch (error) {
        console.error("Không thể tải dữ liệu tài khoản:", error);
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  return children;
}
