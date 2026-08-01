"use server";

import { requireActiveAccount } from "@/lib/auth/server";
import { createServerSupabaseClient } from "@repo/database/server";
import { revalidatePath } from "next/cache";
import { favoriteSchema, type FavoriteInput } from "./schema";

export async function toggleFavorite(movieData: FavoriteInput) {
  const { user } = await requireActiveAccount("/yeu-thich");
  const validated = favoriteSchema.safeParse(movieData);

  if (!validated.success) {
    return { error: "Dữ liệu phim không hợp lệ" };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Database not configured" };

  const { data: existing, error: readError } = await supabase
    .from("sr_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("movie_slug", validated.data.movie_slug)
    .maybeSingle();

  if (readError) return { error: "Không thể cập nhật phim yêu thích" };

  if (existing) {
    const { error } = await supabase
      .from("sr_favorites")
      .delete()
      .eq("id", existing.id)
      .eq("user_id", user.id);

    if (error) return { error: "Không thể cập nhật phim yêu thích" };
  } else {
    const { error } = await supabase.from("sr_favorites").insert({
      user_id: user.id,
      movie_slug: validated.data.movie_slug,
      movie_title: validated.data.movie_title,
      poster_url: validated.data.poster_url,
    });

    if (error) return { error: "Không thể cập nhật phim yêu thích" };
  }

  revalidatePath("/yeu-thich");
  return { success: true };
}

export async function clearAllFavorites() {
  const { user } = await requireActiveAccount("/yeu-thich");
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Database not configured" };

  const { error } = await supabase
    .from("sr_favorites")
    .delete()
    .eq("user_id", user.id);

  if (error) return { error: "Không thể xóa danh sách yêu thích" };

  revalidatePath("/yeu-thich");
  return { success: true };
}

export async function getFavorites() {
  const { user } = await requireActiveAccount("/yeu-thich");
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("sr_favorites")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return error ? [] : data ?? [];
}

export async function getFavoriteSlugs() {
  const { user } = await requireActiveAccount("/yeu-thich");
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("sr_favorites")
    .select("movie_slug")
    .eq("user_id", user.id);

  if (error) return [];
  return data?.map((favorite: { movie_slug: string }) => favorite.movie_slug) ?? [];
}
