import { isValidPlaybackUrl } from "./source-candidates";

export interface EpisodeItem {
  name: string;
  slug: string;
  filename?: string;
  link_m3u8?: string;
  link_embed?: string;
  embed?: string;
  m3u8?: string;
}

export interface EpisodeServer {
  server_name?: string;
  server_data?: EpisodeItem[];
  items?: EpisodeItem[];
}

/**
 * Normalizes episode slug for tolerant matching.
 * e.g. "tap-1" -> "1", "tap-01" -> "1", "full" -> "full"
 */
export function normalizeEpisodeSlug(slug: string = ""): string {
  if (!slug) return "";
  try {
    const decoded = decodeURIComponent(slug).toLowerCase().trim();
    return decoded
      .replace(/^tap-/, "")
      .replace(/^tap\s*/, "")
      .replace(/^0+/, "");
  } catch (_e) {
    return slug.toLowerCase().trim();
  }
}

/**
 * Checks if an episode item is valid (non-empty slug & has valid stream or embed URL).
 */
export function isValidEpisodeItem(item?: EpisodeItem | null): boolean {
  if (!item || typeof item !== "object") return false;
  const slug = (item.slug || "").trim();
  const m3u8 = item.link_m3u8 || item.m3u8 || "";
  const embed = item.link_embed || item.embed || "";

  if (isValidPlaybackUrl(m3u8) || isValidPlaybackUrl(embed)) {
    return true;
  }
  // Allow items with valid non-empty slug if name is provided
  return Boolean(slug && slug !== "" && item.name && item.name !== "");
}

/**
 * Gets default valid episode for a movie (for "Xem ngay" button links).
 * Priority:
 * 1. First valid episode with HLS/Embed stream
 * 2. First episode with valid non-empty slug
 * Returns null if no valid episode exists.
 */
export function getDefaultWatchEpisode(episodes?: EpisodeServer[] | null): EpisodeItem | null {
  if (!episodes || !Array.isArray(episodes) || episodes.length === 0) {
    return null;
  }

  for (const server of episodes) {
    const items = server?.server_data || server?.items || [];
    if (!Array.isArray(items)) continue;

    // First pass: find episode with valid playback URL
    for (const item of items) {
      if (isValidEpisodeItem(item)) {
        return item;
      }
    }
  }

  return null;
}

/**
 * Safely looks up an episode across all servers and providers.
 */
export function findWatchEpisode(
  episodes?: EpisodeServer[] | null,
  targetEpisodeSlug?: string,
  targetEpisodeName?: string
): { episode: EpisodeItem; serverIndex: number } | null {
  if (!episodes || !Array.isArray(episodes) || episodes.length === 0 || !targetEpisodeSlug) {
    return null;
  }

  const normTargetSlug = normalizeEpisodeSlug(targetEpisodeSlug);
  const normTargetName = normalizeEpisodeSlug(targetEpisodeName || targetEpisodeSlug);

  for (let sIdx = 0; sIdx < episodes.length; sIdx++) {
    const server = episodes[sIdx];
    const items = server?.server_data || server?.items || [];
    if (!Array.isArray(items)) continue;

    // Pass 1: Exact slug match
    let match = items.find((item) => item?.slug === targetEpisodeSlug);
    if (match && isValidEpisodeItem(match)) {
      return { episode: match, serverIndex: sIdx };
    }

    // Pass 2: Normalized slug match
    match = items.find((item) => {
      if (!item) return false;
      const normSlug = normalizeEpisodeSlug(item.slug);
      const normName = normalizeEpisodeSlug(item.name);
      return normSlug === normTargetSlug || normName === normTargetName;
    });
    if (match && isValidEpisodeItem(match)) {
      return { episode: match, serverIndex: sIdx };
    }
  }

  return null;
}
