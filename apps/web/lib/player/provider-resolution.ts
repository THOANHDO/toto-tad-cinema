import {
  getMovieDetail,
  getMovieDetailNguonC,
  getMovieDetailPhimApi,
  searchNguonC,
  searchPhimApi,
} from "../api/ophim";
import {
  extractMovieIdentity,
  scoreMovieMatch,
  type CanonicalMovieIdentity,
  type MatchScoreResult,
} from "./movie-identity";

export interface ProviderMovieResolution {
  provider: "ophim" | "nguonc" | "phimapi";
  status: "found" | "not_found" | "error";
  movie?: any;
  episodes?: any[];
  matchScore?: number;
  matchMethod?: string;
  matchedSlug?: string;
}

export interface MultiProviderResolution {
  movieSlug: string;
  anchorIdentity: CanonicalMovieIdentity;
  primaryMovie?: any;
  ophim?: ProviderMovieResolution;
  nguonc?: ProviderMovieResolution;
  phimapi?: ProviderMovieResolution;
}

/**
 * Resolves movie details for a secondary provider (NguonC or PhimAPI)
 * by verifying canonical movie identity and executing search fallback if direct slug mismatches or 404s.
 */
async function resolveSecondaryProvider(
  provider: "nguonc" | "phimapi",
  movieSlug: string,
  anchorIdentity: CanonicalMovieIdentity
): Promise<ProviderMovieResolution> {
  const getDetail = provider === "nguonc" ? getMovieDetailNguonC : getMovieDetailPhimApi;

  // 1. Try direct slug fetch
  try {
    const directData = await getDetail(movieSlug);
    if (directData && (directData.movie || directData.name)) {
      const candIdentity = extractMovieIdentity(directData);
      const match = scoreMovieMatch(anchorIdentity, candIdentity);
      if (match.isMatch && match.score >= 60) {
        return {
          provider,
          status: "found",
          movie: directData.movie || directData,
          episodes: directData.episodes || directData.movie?.episodes || [],
          matchScore: match.score,
          matchMethod: `direct_${match.method}`,
          matchedSlug: movieSlug,
        };
      }
    }
  } catch (_e) {}

  // 2. Direct slug failed or score < 60 -> Search provider using anchor title
  const searchKeyword = anchorIdentity.title || anchorIdentity.originalTitle;
  if (!searchKeyword) {
    return { provider, status: "not_found" };
  }

  try {
    const searchFn = provider === "nguonc" ? searchNguonC : searchPhimApi;
    const candidates = await searchFn(searchKeyword);

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return { provider, status: "not_found" };
    }

    let bestCand: any = null;
    let bestMatch: MatchScoreResult = { score: 0, method: "", isMatch: false, confidence: "low" };

    for (const cand of candidates.slice(0, 5)) {
      const candIdentity = extractMovieIdentity(cand);
      const match = scoreMovieMatch(anchorIdentity, candIdentity);
      if (match.isMatch && match.score > bestMatch.score && match.score >= 60) {
        bestMatch = match;
        bestCand = cand;
      }
    }

    if (bestCand && bestMatch.isMatch && bestCand.slug) {
      // Fetch full movie detail for winning search candidate
      const fullData = await getDetail(bestCand.slug);
      if (fullData) {
        return {
          provider,
          status: "found",
          movie: fullData.movie || fullData,
          episodes: fullData.episodes || fullData.movie?.episodes || [],
          matchScore: bestMatch.score,
          matchMethod: `search_${bestMatch.method}`,
          matchedSlug: bestCand.slug,
        };
      }
    }
  } catch (_e) {}

  return { provider, status: "not_found" };
}

/**
 * Resolves multi-provider movies with canonical identity matching across OPhim, NguonC, and PhimAPI.
 */
export async function resolveMultiProviderMovies(movieSlug: string): Promise<MultiProviderResolution> {
  // Fetch primary OPhim anchor movie
  let opMovie: any = null;
  let opEpisodes: any[] = [];
  let opStatus: "found" | "not_found" = "not_found";

  try {
    const opData = await getMovieDetail(movieSlug);
    if (opData && opData.movie) {
      opMovie = opData.movie;
      opEpisodes = opData.episodes || opData.movie.episodes || [];
      opStatus = "found";
    }
  } catch (_e) {}

  const anchorIdentity = extractMovieIdentity(opMovie || { slug: movieSlug });

  const ophimRes: ProviderMovieResolution = {
    provider: "ophim",
    status: opStatus,
    movie: opMovie,
    episodes: opEpisodes,
    matchScore: 100,
    matchMethod: "primary_anchor",
    matchedSlug: movieSlug,
  };

  // Resolve secondary providers in parallel with canonical identity scoring & search fallback
  const [ncRes, paRes] = await Promise.all([
    resolveSecondaryProvider("nguonc", movieSlug, anchorIdentity),
    resolveSecondaryProvider("phimapi", movieSlug, anchorIdentity),
  ]);

  const primaryMovie = opMovie || ncRes.movie || paRes.movie;

  return {
    movieSlug,
    anchorIdentity,
    primaryMovie,
    ophim: ophimRes,
    nguonc: ncRes,
    phimapi: paRes,
  };
}
