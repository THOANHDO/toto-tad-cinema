export interface CanonicalEpisodeIdentity {
  rawSlug: string;
  rawName: string;
  normalizedSlug: string;
  normalizedName: string;
  episodeNumber?: number;
  isSpecial?: boolean;
  isFull?: boolean;
}

/**
 * Parses episode number and attributes from raw episode slug or name.
 */
export function parseEpisodeIdentity(slug: string, name?: string): CanonicalEpisodeIdentity {
  const rawSlug = (slug || "").toString().trim();
  const rawName = (name || slug || "").toString().trim();

  const normalizedSlug = rawSlug
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  const normalizedName = rawName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  // Check for full/movie indicators
  const isFull =
    normalizedSlug.includes("full") ||
    normalizedSlug.includes("movie") ||
    normalizedName.includes("full") ||
    normalizedName.includes("movie");

  const isSpecial =
    normalizedSlug.includes("ova") ||
    normalizedSlug.includes("special") ||
    normalizedName.includes("ova") ||
    normalizedName.includes("special");

  // Extract episode number
  let episodeNumber: number | undefined = undefined;

  // Try matching numbers from raw strings like "Tập 01", "Episode 1", "EP.1", "1", "tap-1"
  const numMatch = rawName.match(/(?:tập|tap|ep|episode|sp)?\s*0*(\d+)/i) || rawSlug.match(/0*(\d+)/);
  if (numMatch && numMatch[1]) {
    const parsed = parseInt(numMatch[1], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 5000) {
      episodeNumber = parsed;
    }
  }

  return {
    rawSlug,
    rawName,
    normalizedSlug,
    normalizedName,
    episodeNumber,
    isSpecial,
    isFull,
  };
}

export interface MatchEpisodeResult {
  matchedItem: any;
  method: string;
  confidence: "exact" | "high" | "medium" | "low";
}

/**
 * Matches target episode against a provider's episode items list.
 * STRICT: Does NOT fallback to first item for multi-episode series!
 */
export function matchEpisode(
  target: CanonicalEpisodeIdentity,
  items: any[],
  isSingleEpisodeMovie = false
): MatchEpisodeResult | null {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return null;
  }

  // 1. Exact normalized slug match
  for (const item of items) {
    const itemSlug = item.slug || item.id || "";
    const itemIdentity = parseEpisodeIdentity(itemSlug, item.name || item.filename);
    if (target.normalizedSlug === itemIdentity.normalizedSlug && target.normalizedSlug !== "") {
      return { matchedItem: item, method: "exact_slug", confidence: "exact" };
    }
  }

  // 2. Exact episode number match
  if (target.episodeNumber !== undefined) {
    for (const item of items) {
      const itemSlug = item.slug || item.id || "";
      const itemIdentity = parseEpisodeIdentity(itemSlug, item.name || item.filename);
      if (itemIdentity.episodeNumber === target.episodeNumber) {
        return { matchedItem: item, method: "exact_episode_number", confidence: "exact" };
      }
    }
  }

  // 3. Exact normalized name match
  for (const item of items) {
    const itemSlug = item.slug || item.id || "";
    const itemIdentity = parseEpisodeIdentity(itemSlug, item.name || item.filename);
    if (target.normalizedName === itemIdentity.normalizedName && target.normalizedName !== "") {
      return { matchedItem: item, method: "exact_name", confidence: "high" };
    }
  }

  // 4. Single movie / 1 episode fallback ONLY IF current movie is single episode AND provider has 1 item
  if (isSingleEpisodeMovie && items.length === 1) {
    const singleItem = items[0];
    const singleIdentity = parseEpisodeIdentity(singleItem.slug || "", singleItem.name || "");
    if (target.isFull || singleIdentity.isFull || target.episodeNumber === 1 || singleIdentity.episodeNumber === 1) {
      return { matchedItem: singleItem, method: "single_movie_fallback", confidence: "medium" };
    }
  }

  // Reject ambiguous / unmatched
  return null;
}
