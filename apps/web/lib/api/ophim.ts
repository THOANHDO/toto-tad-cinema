// OPhim API Service
import { Movie } from "@/types/movie";

const BASE_URL = process.env.NEXT_PUBLIC_OPHIM_API_URL || "https://ophim1.com";

export const UNSUPPORTED_OPHIM_SLUGS = new Set([
  "phim-bo-dang-chieu",
  "phim-bo-hoan-thanh",
  "phim-sap-chieu",
  "subteam",
]);

// Helper function to build full image URL cleanly
export function resolveOPhimImageUrl(value?: string | null, baseUrl?: string): string {
  if (!value || typeof value !== "string" || !value.trim()) {
    return "/placeholder.jpg";
  }

  const trimmed = value.trim();

  // Absolute URL
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Remove leading slashes
  let cleanPath = trimmed.replace(/^\/+/, "");

  // Remove duplicate uploads/movies prefixes if any
  cleanPath = cleanPath.replace(/^(uploads\/movies\/)+/, "uploads/movies/");

  const domain = baseUrl ? baseUrl.replace(/\/+$/, "") : "https://img.ophim.live";

  if (cleanPath.startsWith("uploads/movies/")) {
    return `${domain}/${cleanPath}`;
  }

  return `${domain}/uploads/movies/${cleanPath}`;
}

export function getImageUrl(path: string): string {
  return resolveOPhimImageUrl(path);
}

// Global NSFW Filter
export const filterNSFW = (movies: Movie[]) => {
  if (!movies) return [];
  return movies.filter(
    (movie) =>
      !movie.category?.some((cat) => cat.slug === "phim-18") &&
      !movie.name?.toLowerCase().includes("phim 18+") &&
      !movie.origin_name?.toLowerCase().includes("phim 18+")
  );
};

/**
 * Safely extracts and deduplicates array of Movie items from various API response shapes.
 */
export function extractMovieItems(payload: any): Movie[] {
  if (!payload || typeof payload !== "object") return [];

  let rawList: any[] = [];
  if (Array.isArray(payload.items)) {
    rawList = payload.items;
  } else if (Array.isArray(payload.data?.items)) {
    rawList = payload.data.items;
  } else if (Array.isArray(payload.data?.data?.items)) {
    rawList = payload.data.data.items;
  }

  if (!rawList || rawList.length === 0) return [];

  const seenSlugs = new Set<string>();
  const result: Movie[] = [];

  for (const item of rawList) {
    if (!item || typeof item !== "object") continue;
    const slug = (item.slug || item._id || "").toString().trim();
    if (!slug) continue;
    if (seenSlugs.has(slug)) continue;

    seenSlugs.add(slug);
    result.push(item);
  }

  return filterNSFW(result);
}

// In-memory Server Cache & In-flight Deduplication
interface CacheEntry {
  data: any;
  timestamp: number;
  ttlMs: number;
}

const serverMemoryCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<any>>();

export function clearServerCache() {
  serverMemoryCache.clear();
  inFlightRequests.clear();
}

export function getCachedServerData(key: string, allowStale = true): any | null {
  const entry = serverMemoryCache.get(key);
  if (!entry) return null;
  const isFresh = Date.now() - entry.timestamp <= entry.ttlMs;
  if (isFresh || allowStale) {
    return entry.data;
  }
  return null;
}

export function setCachedServerData(key: string, data: any, ttlSeconds: number = 300) {
  serverMemoryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttlMs: ttlSeconds * 1000,
  });
}

export async function safeFetchOPhim(
  pathWithQuery: string,
  options?: { revalidate?: number; ttlSeconds?: number }
): Promise<any> {
  const isServer = typeof window === "undefined";
  const cleanPath = pathWithQuery.replace(/^\/+/, "");

  const fullUrl = isServer
    ? `${BASE_URL}/${cleanPath}`
    : `/api/providers/ophim/${cleanPath}`;

  const cacheKey = cleanPath;
  const ttl = options?.ttlSeconds ?? options?.revalidate ?? 300;

  // Check fresh in-memory cache first
  const cachedFresh = getCachedServerData(cacheKey, false);
  if (cachedFresh !== null) {
    return cachedFresh;
  }

  // Deduplicate concurrent in-flight requests
  if (inFlightRequests.has(fullUrl)) {
    return inFlightRequests.get(fullUrl);
  }

  const fetchPromise = (async () => {
    let attempts = 0;
    const maxAttempts = 2; // 1 initial + 1 retry for 50x

    while (attempts < maxAttempts) {
      attempts++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(fullUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "application/json, text/plain, */*",
          },
          ...(isServer && options?.revalidate !== undefined
            ? { next: { revalidate: options.revalidate } }
            : {}),
        });

        clearTimeout(timeoutId);

        if (response.status === 404) {
          // Do not retry 404
          return null;
        }

        if (response.status >= 500 && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          continue;
        }

        if (!response.ok) {
          // Fallback to stale cache if available
          return getCachedServerData(cacheKey, true);
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json") && !contentType.includes("text/plain")) {
          return getCachedServerData(cacheKey, true);
        }

        const data = await response.json();
        if (data) {
          setCachedServerData(cacheKey, data, ttl);
        }
        return data;
      } catch (_err: unknown) {
        clearTimeout(timeoutId);
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          continue;
        }
        // Fallback to stale cache on network failure or timeout
        return getCachedServerData(cacheKey, true);
      }
    }
    return getCachedServerData(cacheKey, true);
  })();

  inFlightRequests.set(fullUrl, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    inFlightRequests.delete(fullUrl);
  }
}

// Fetch newly updated movies (TTL: 3 mins)
export async function getNewlyUpdatedMovies(page: number = 1) {
  const data = await safeFetchOPhim(`danh-sach/phim-moi-cap-nhat?page=${page}`, {
    revalidate: 180,
    ttlSeconds: 180,
  });
  const items = extractMovieItems(data);
  return { items, data: { items } };
}

// Fetch movies by type (phim-le, phim-bo, hoat-hinh, tv-shows, etc.) (TTL: 10 mins)
export async function getMoviesByType(type: string, page: number = 1, limit: number = 24) {
  if (UNSUPPORTED_OPHIM_SLUGS.has(type)) {
    return { data: { items: [], params: { pagination: { totalItems: 0 } } } };
  }

  const data = await safeFetchOPhim(`v1/api/danh-sach/${type}?page=${page}&limit=${limit}`, {
    revalidate: 600,
    ttlSeconds: 600,
  });
  const items = extractMovieItems(data);
  return { data: { items, params: { pagination: { totalItems: items.length } } } };
}

// Fetch movies by genre (TTL: 10 mins)
export async function getMoviesByGenre(genreSlug: string, page: number = 1) {
  const data = await safeFetchOPhim(`v1/api/the-loai/${genreSlug}?page=${page}`, {
    revalidate: 600,
    ttlSeconds: 600,
  });
  if (!data) return { data: { items: [] } };
  if (data.data?.items) {
    data.data.items = filterNSFW(data.data.items);
  }
  return data;
}

// Fetch movies by country (TTL: 10 mins)
export async function getMoviesByCountry(countrySlug: string, page: number = 1) {
  const data = await safeFetchOPhim(`v1/api/quoc-gia/${countrySlug}?page=${page}`, {
    revalidate: 600,
    ttlSeconds: 600,
  });
  if (!data) return { data: { items: [] } };
  if (data.data?.items) {
    data.data.items = filterNSFW(data.data.items);
  }
  return data;
}

// Search movies (TTL: 60 seconds)
export async function searchMovies(keyword: string, page: number = 1) {
  const data = await safeFetchOPhim(
    `v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`,
    { revalidate: 60, ttlSeconds: 60 }
  );
  if (!data) return { data: { items: [] } };
  if (data.data?.items) {
    data.data.items = filterNSFW(data.data.items);
  }
  return data;
}

// Advanced Search / Filter movies
export async function advancedSearch(params: {
  keyword?: string;
  category?: string | string[];
  country?: string | string[];
  year?: string | string[];
  type?: string | string[];
  page?: number;
  limit?: number;
}) {
  const {
    keyword = "",
    category = "",
    country = "",
    year = "",
    type = "",
    page = 1,
    limit = 24,
  } = params;

  const formatValue = (val: string | string[]) => {
    if (Array.isArray(val)) return val.join(",");
    return val;
  };

  const catStr = formatValue(category);
  const countryStr = formatValue(country);
  const yearStr = formatValue(year);
  const typeStr = formatValue(type);

  // Build query string
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (keyword) queryParams.append("keyword", keyword);
  if (catStr) queryParams.append("category", catStr);
  if (countryStr) queryParams.append("country", countryStr);
  if (yearStr) queryParams.append("year", yearStr);

  let endpoint = "tim-kiem";
  if (typeStr && !typeStr.includes(",")) {
    if (UNSUPPORTED_OPHIM_SLUGS.has(typeStr)) {
      return { data: { items: [], params: { pagination: { totalItems: 0 } } } };
    }
    endpoint = `danh-sach/${typeStr}`;
  } else if (catStr && !catStr.includes(",")) {
    endpoint = `the-loai/${catStr}`;
  } else if (countryStr && !countryStr.includes(",")) {
    endpoint = `quoc-gia/${countryStr}`;
  } else if (yearStr && !yearStr.includes(",")) {
    endpoint = `nam-phat-hanh/${yearStr}`;
  }

  const data = await safeFetchOPhim(`v1/api/${endpoint}?${queryParams.toString()}`, {
    revalidate: 3600,
  });

  if (!data) return { data: { items: [], params: { pagination: { totalItems: 0 } } } };
  if (data.data?.items) {
    data.data.items = filterNSFW(data.data.items);
  }
  return data;
}

// Fetch movie details by slug
export async function getMovieDetail(slug: string) {
  const data = await safeFetchOPhim(`phim/${slug}`, { revalidate: 600, ttlSeconds: 600 });
  if (!data) return null;

  if (data.movie?.category?.some((cat: any) => cat.slug === "phim-18")) {
    return null;
  }

  return data;
}

// Fetch movie peoples
export async function getMoviePeoples(slug: string) {
  const data = await safeFetchOPhim(`v1/api/phim/${slug}/peoples`, { revalidate: 3600 });
  return data || {};
}

// Fetch movie details from NguonC API
export async function getMovieDetailNguonC(slug: string) {
  try {
    const response = await fetch(`https://phim.nguonc.com/api/film/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error("Error fetching from NguonC:", error);
    return null;
  }
}

// Fetch movie details from PhimApi
export async function getMovieDetailPhimApi(slug: string) {
  try {
    const response = await fetch(`https://phimapi.com/phim/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error("Error fetching from PhimApi:", error);
    return null;
  }
}

// Categories list (TTL: 30 mins)
export async function getCategories() {
  const data = await safeFetchOPhim(`v1/api/the-loai`, { revalidate: 1800, ttlSeconds: 1800 });
  if (!data) return { data: { items: [] } };
  if (data.data?.items) {
    data.data.items = data.data.items.filter((cat: any) => cat.slug !== "phim-18");
  }
  return data;
}

// Countries list (TTL: 30 mins)
export async function getCountries() {
  const data = await safeFetchOPhim(`v1/api/quoc-gia`, { revalidate: 1800, ttlSeconds: 1800 });
  return data || { data: { items: [] } };
}

export const movieTypes = [
  { name: "Phim mới", slug: "phim-moi" },
  { name: "Phim bộ", slug: "phim-bo" },
  { name: "Phim lẻ", slug: "phim-le" },
  { name: "TV Shows", slug: "tv-shows" },
  { name: "Hoạt hình", slug: "hoat-hinh" },
  { name: "Phim chiếu rạp", slug: "phim-chieu-rap" },
];
