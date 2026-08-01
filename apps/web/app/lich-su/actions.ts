"use server";

import { requireActiveAccount } from "@/lib/auth/server";
import { createServerSupabaseClient } from "@repo/database/server";
import { revalidatePath } from "next/cache";
import { watchHistorySchema, type WatchHistoryInput } from "./schema";

export async function updateWatchHistory(historyData: WatchHistoryInput) {
  const { user } = await requireActiveAccount("/lich-su");
  const validated = watchHistorySchema.safeParse(historyData);
  if (!validated.success) return { error: "Dữ liệu lịch sử không hợp lệ" };

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Database not configured" };

  const { error } = await supabase.from("sr_watch_history").upsert(
    {
      user_id: user.id,
      movie_slug: validated.data.movie_slug,
      movie_title: validated.data.movie_title,
      poster_url: validated.data.poster_url,
      episode_slug: validated.data.episode_slug,
      episode_name: validated.data.episode_name,
      duration: validated.data.duration,
      playback_time: validated.data.playback_time,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,movie_slug" },
  );

  if (error) return { error: "Không thể cập nhật lịch sử xem" };

  revalidatePath("/lich-su");
  return { success: true };
}

export async function getWatchHistory() {
  const { user } = await requireActiveAccount("/lich-su");
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("sr_watch_history")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return error ? [] : data ?? [];
}

export async function clearHistory() {
  const { user } = await requireActiveAccount("/lich-su");
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Database not configured" };

  const { error } = await supabase
    .from("sr_watch_history")
    .delete()
    .eq("user_id", user.id);

  if (error) return { error: "Không thể xóa lịch sử xem" };

  revalidatePath("/lich-su");
  return { success: true };
}
