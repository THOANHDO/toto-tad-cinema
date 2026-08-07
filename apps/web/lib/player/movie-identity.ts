export interface CanonicalMovieIdentity {
  title: string;
  originalTitle?: string;
  year?: number;
  imdbId?: string;
  tmdbId?: string;
  slug?: string;
}

/**
 * Normalizes movie title by lowercasing, stripping Vietnamese diacritics,
 * collapsing whitespace, and removing non-alphanumeric punctuation.
 */
export function normalizeTitle(text?: string | null): string {
  if (!text || typeof text !== "string") return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts CanonicalMovieIdentity from raw movie payload across providers.
 */
export function extractMovieIdentity(data: any): CanonicalMovieIdentity {
  if (!data) return { title: "" };
  const movie = data.movie || data;

  const title = movie.name || movie.title || "";
  const originalTitle = movie.origin_name || movie.original_name || movie.org_name || "";

  const rawYear = Number(movie.year);
  const year = Number.isFinite(rawYear) && rawYear > 1900 && rawYear < 2100 ? rawYear : undefined;

  const imdbId = (movie.imdb_id || movie.imdbId || movie.imdb || "").toString().trim() || undefined;
  const tmdbId = (movie.tmdb_id || movie.tmdbId || movie.tmdb || "").toString().trim() || undefined;
  const slug = (movie.slug || "").toString().trim() || undefined;

  return {
    title,
    originalTitle,
    year,
    imdbId,
    tmdbId,
    slug,
  };
}

export interface MatchScoreResult {
  score: number;
  method: string;
  isMatch: boolean;
  confidence: "exact" | "high" | "medium" | "low";
}

/**
 * Scores movie match confidence between an anchor movie and a candidate movie.
 * Minimum threshold for valid match is 60 points.
 */
export function scoreMovieMatch(
  anchor: CanonicalMovieIdentity,
  candidate: CanonicalMovieIdentity
): MatchScoreResult {
  if (!anchor.title || !candidate.title) {
    return { score: 0, method: "missing_title", isMatch: false, confidence: "low" };
  }

  // 1. Exact IMDb ID match (+100)
  if (anchor.imdbId && candidate.imdbId && anchor.imdbId.toLowerCase() === candidate.imdbId.toLowerCase()) {
    return { score: 100, method: "exact_imdb_id", isMatch: true, confidence: "exact" };
  }

  // 2. Exact TMDb ID match (+90)
  if (anchor.tmdbId && candidate.tmdbId && anchor.tmdbId.toLowerCase() === candidate.tmdbId.toLowerCase()) {
    return { score: 90, method: "exact_tmdb_id", isMatch: true, confidence: "exact" };
  }

  // Year conflict check
  let yearConflict = false;
  if (anchor.year && candidate.year && Math.abs(anchor.year - candidate.year) > 1) {
    yearConflict = true;
  }

  if (yearConflict) {
    return { score: 0, method: "year_conflict_penalty", isMatch: false, confidence: "low" };
  }

  const normAnchorTitle = normalizeTitle(anchor.title);
  const normCandTitle = normalizeTitle(candidate.title);

  const normAnchorOrg = normalizeTitle(anchor.originalTitle);
  const normCandOrg = normalizeTitle(candidate.originalTitle);

  const sameYear = anchor.year && candidate.year ? anchor.year === candidate.year : false;

  // 3. Exact original title match with same year (+85)
  if (normAnchorOrg && normCandOrg && normAnchorOrg === normCandOrg && sameYear) {
    return { score: 85, method: "exact_original_title_and_year", isMatch: true, confidence: "high" };
  }

  // 4. Exact localized title match with same year (+80)
  if (normAnchorTitle && normCandTitle && normAnchorTitle === normCandTitle && sameYear) {
    return { score: 80, method: "exact_title_and_year", isMatch: true, confidence: "high" };
  }

  // 5. Exact original title match without year conflict (+75)
  if (normAnchorOrg && normCandOrg && normAnchorOrg === normCandOrg) {
    return { score: 75, method: "exact_original_title", isMatch: true, confidence: "high" };
  }

  // 6. Cross match: anchor original title matches candidate title (+70)
  if (normAnchorOrg && normCandTitle && normAnchorOrg === normCandTitle) {
    return { score: 70, method: "cross_title_match", isMatch: true, confidence: "medium" };
  }

  // 7. Exact localized title match (+65)
  if (normAnchorTitle && normCandTitle && normAnchorTitle === normCandTitle) {
    return { score: 65, method: "exact_title", isMatch: true, confidence: "medium" };
  }

  return { score: 0, method: "insufficient_match_score", isMatch: false, confidence: "low" };
}
