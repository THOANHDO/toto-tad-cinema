"use server";

import { requireActiveAccount } from "@/lib/auth/server";
import { createServerSupabaseClient } from "@repo/database/server";
import { revalidatePath } from "next/cache";

export interface LeaderboardMovieItem {
  movie_slug: string;
  movie_title: string;
  poster_url: string | null;
  like_count: number;
  likers: string[];
}

export interface CommunityCommentItem {
  id: string;
  user_id: string;
  author_name: string;
  movie_slug: string;
  movie_title: string;
  poster_url: string | null;
  episode_name: string | null;
  content: string;
  created_at: string;
  is_owner?: boolean;
}

export async function getLeaderboardMovies(): Promise<LeaderboardMovieItem[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  try {
    // 1. Fetch all favorites
    const { data: favorites, error: favError } = await supabase
      .from("sr_favorites")
      .select("movie_slug, movie_title, poster_url, user_id");

    if (favError || !favorites || favorites.length === 0) return [];

    // 2. Fetch all user accounts to map display names
    const { data: users } = await supabase
      .from("user_accounts")
      .select("user_id, display_name");

    const userMap = new Map<string, string>();
    if (users) {
      for (const u of users) {
        userMap.set(u.user_id, u.display_name || "Thành viên");
      }
    }

    // 3. Aggregate by movie_slug
    const movieAgg = new Map<string, {
      movie_slug: string;
      movie_title: string;
      poster_url: string | null;
      likers: Set<string>;
    }>();

    for (const fav of favorites) {
      if (!fav.movie_slug) continue;
      const title = fav.movie_title || fav.movie_slug;
      const poster = fav.poster_url || null;
      const author = userMap.get(fav.user_id) || "Thành viên";

      if (!movieAgg.has(fav.movie_slug)) {
        movieAgg.set(fav.movie_slug, {
          movie_slug: fav.movie_slug,
          movie_title: title,
          poster_url: poster,
          likers: new Set([author]),
        });
      } else {
        const item = movieAgg.get(fav.movie_slug)!;
        if (poster && !item.poster_url) item.poster_url = poster;
        if (title && item.movie_title === fav.movie_slug) item.movie_title = title;
        item.likers.add(author);
      }
    }

    const leaderboard: LeaderboardMovieItem[] = Array.from(movieAgg.values()).map((m) => ({
      movie_slug: m.movie_slug,
      movie_title: m.movie_title,
      poster_url: m.poster_url,
      like_count: m.likers.size,
      likers: Array.from(m.likers),
    }));

    // Sort descending by like count
    leaderboard.sort((a, b) => b.like_count - a.like_count);
    return leaderboard;
  } catch (err) {
    console.error("Failed to load leaderboard:", err);
    return [];
  }
}

export async function getRecentCommunityComments(limit = 30): Promise<CommunityCommentItem[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  try {
    const { data: comments, error } = await supabase
      .from("sr_comments")
      .select("id, user_id, movie_slug, movie_title, poster_url, episode_name, content, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !comments) return [];

    // Fetch user accounts
    const userIds = Array.from(new Set(comments.map((c) => c.user_id)));
    const { data: users } = await supabase
      .from("user_accounts")
      .select("user_id, display_name")
      .in("user_id", userIds);

    const userMap = new Map<string, string>();
    if (users) {
      for (const u of users) {
        userMap.set(u.user_id, u.display_name || "Thành viên");
      }
    }

    // Get current user id if any
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id;

    return comments.map((c) => ({
      ...c,
      author_name: userMap.get(c.user_id) || "Thành viên",
      is_owner: currentUserId ? c.user_id === currentUserId : false,
    }));
  } catch (err) {
    console.error("Failed to load community comments:", err);
    return [];
  }
}

export async function getMovieComments(movieSlug: string): Promise<CommunityCommentItem[]> {
  if (!movieSlug) return [];
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  try {
    const { data: comments, error } = await supabase
      .from("sr_comments")
      .select("id, user_id, movie_slug, movie_title, poster_url, episode_name, content, created_at")
      .eq("movie_slug", movieSlug)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !comments) return [];

    const userIds = Array.from(new Set(comments.map((c) => c.user_id)));
    const { data: users } = await supabase
      .from("user_accounts")
      .select("user_id, display_name")
      .in("user_id", userIds);

    const userMap = new Map<string, string>();
    if (users) {
      for (const u of users) {
        userMap.set(u.user_id, u.display_name || "Thành viên");
      }
    }

    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id;

    return comments.map((c) => ({
      ...c,
      author_name: userMap.get(c.user_id) || "Thành viên",
      is_owner: currentUserId ? c.user_id === currentUserId : false,
    }));
  } catch (err) {
    console.error("Failed to load movie comments:", err);
    return [];
  }
}

export async function postMovieComment(data: {
  movie_slug: string;
  movie_title: string;
  poster_url?: string | null;
  episode_name?: string | null;
  content: string;
}) {
  const { user } = await requireActiveAccount();
  const content = (data.content || "").trim();

  if (!content || content.length < 2) {
    return { error: "Nội dung bình luận quá ngắn (tối thiểu 2 ký tự)." };
  }

  if (content.length > 500) {
    return { error: "Nội dung bình luận không được vượt quá 500 ký tự." };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Database not configured" };

  const { error } = await supabase.from("sr_comments").insert({
    user_id: user.id,
    movie_slug: data.movie_slug,
    movie_title: data.movie_title || data.movie_slug,
    poster_url: data.poster_url || null,
    episode_name: data.episode_name || null,
    content,
  });

  if (error) {
    console.error("Failed to insert comment:", error);
    return { error: "Không thể gửi bình luận, vui lòng thử lại." };
  }

  revalidatePath(`/phim/${data.movie_slug}`);
  revalidatePath("/bang-xep-hang");
  return { success: true };
}

export async function deleteMovieComment(commentId: string, movieSlug?: string) {
  const { user, account } = await requireActiveAccount();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Database not configured" };

  let query = supabase.from("sr_comments").delete().eq("id", commentId);
  if (account.role !== "admin") {
    query = query.eq("user_id", user.id);
  }

  const { error } = await query;
  if (error) {
    console.error("Failed to delete comment:", error);
    return { error: "Không thể xóa bình luận." };
  }

  if (movieSlug) {
    revalidatePath(`/phim/${movieSlug}`);
  }
  revalidatePath("/bang-xep-hang");
  return { success: true };
}
