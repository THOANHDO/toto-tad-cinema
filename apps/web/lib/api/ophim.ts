// OPhim API Service
import { Movie } from "@/types/movie";

const BASE_URL = process.env.NEXT_PUBLIC_OPHIM_API_URL || "https://ophim1.com";

export const UNSUPPORTED_OPHIM_SLUGS = new Set([
  "phim-bo-dang-chieu",
  "phim-bo-hoan-thanh",
  "phim-sap-chieu",
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
const filterNSFW = (movies: Movie[]) => {
  if (!movies) return [];
  return movies.filter(
    (movie) =>
      !movie.category?.some((cat) => cat.slug === "phim-18") &&
      !movie.name?.toLowerCase().includes("phim 18+") &&
      !movie.origin_name?.toLowerCase().includes("phim 18+")
  );
};

// In-flight deduplication cache
const inFlightRequests = new Map<string, Promise<any>>();

export async function safeFetchOPhim(
  pathWithQuery: string,
  options?: { revalidate?: number }
): Promise<any> {
  const isServer = typeof window === "undefined";
  const cleanPath = pathWithQuery.replace(/^\/+/, "");

  const fullUrl = isServer
    ? `${BASE_URL}/${cleanPath}`
    : `/api/providers/ophim/${cleanPath}`;

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
          return null;
        }

        if (response.status >= 500 && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          continue;
        }

        if (!response.ok) {
          return null;
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json") && !contentType.includes("text/plain")) {
          return null;
        }

        const data = await response.json();
        return data;
      } catch (_err: unknown) {
        clearTimeout(timeoutId);
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          continue;
        }
        return null;
      }
    }
    return null;
  })();

  inFlightRequests.set(fullUrl, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    inFlightRequests.delete(fullUrl);
  }
}

// Fetch newly updated movies
export async function getNewlyUpdatedMovies(page: number = 1) {
  const data = await safeFetchOPhim(`danh-sach/phim-moi-cap-nhat?page=${page}`, {
    revalidate: 3600,
  });
  if (!data) return { items: [] };
  if (data.items) {
    data.items = filterNSFW(data.items);
  }
  return data;
}

// Fetch movies by type (phim-le, phim-bo, hoat-hinh, tv-shows, etc.)
export async function getMoviesByType(type: string, page: number = 1, limit: number = 24) {
  if (UNSUPPORTED_OPHIM_SLUGS.has(type)) {
    return { data: { items: [], params: { pagination: { totalItems: 0 } } } };
  }

  const data = await safeFetchOPhim(`v1/api/danh-sach/${type}?page=${page}&limit=${limit}`, {
    revalidate: 3600,
  });
  if (!data) return { data: { items: [], params: { pagination: { totalItems: 0 } } } };
  if (data.data?.items) {
    data.data.items = filterNSFW(data.data.items);
  }
  return data;
}

// Fetch movies by genre
export async function getMoviesByGenre(genreSlug: string, page: number = 1) {
  const data = await safeFetchOPhim(`v1/api/the-loai/${genreSlug}?page=${page}`, {
    revalidate: 3600,
  });
  if (!data) return { data: { items: [] } };
  if (data.data?.items) {
    data.data.items = filterNSFW(data.data.items);
  }
  return data;
}

// Fetch movies by country
export async function getMoviesByCountry(countrySlug: string, page: number = 1) {
  const data = await safeFetchOPhim(`v1/api/quoc-gia/${countrySlug}?page=${page}`, {
    revalidate: 3600,
  });
  if (!data) return { data: { items: [] } };
  if (data.data?.items) {
    data.data.items = filterNSFW(data.data.items);
  }
  return data;
}

// Search movies
export async function searchMovies(keyword: string, page: number = 1) {
  const data = await safeFetchOPhim(
    `v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`,
    { revalidate: 60 }
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
  const data = await safeFetchOPhim(`phim/${slug}`, { revalidate: 3600 });
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

// Fetch categories (genres)
export async function getCategories() {
  const data = await safeFetchOPhim(`v1/api/the-loai`, { revalidate: 86400 });
  if (!data) return { data: { items: [] } };
  if (data.data?.items) {
    data.data.items = data.data.items.filter((cat: any) => cat.slug !== "phim-18");
  }
  return data;
}

// Fetch countries
export async function getCountries() {
  const data = await safeFetchOPhim(`v1/api/quoc-gia`, { revalidate: 86400 });
  return data || { data: { items: [] } };
}

// Movie types for navigation and homepage
export const movieTypes = [
  { name: "Phim Mới", slug: "phim-moi", icon: "Sparkles" },
  { name: "Phim Lẻ", slug: "phim-le", icon: "Film" },
  { name: "Phim Bộ", slug: "phim-bo", icon: "Tv" },
  { name: "Hoạt Hình", slug: "hoat-hinh", icon: "Gamepad2" },
  { name: "TV Shows", slug: "tv-shows", icon: "Monitor" },
  { name: "Vietsub", slug: "phim-vietsub", icon: "Languages" },
  { name: "Thuyết Minh", slug: "phim-thuyet-minh", icon: "Mic2" },
  { name: "Lồng Tiếng", slug: "phim-long-tieng", icon: "Volume2" },
  { name: "Bộ Đang Chiếu", slug: "phim-bo-dang-chieu", icon: "PlayCircle", unsupportedInOPhim: true },
  { name: "Bộ Hoàn Thành", slug: "phim-bo-hoan-thanh", icon: "CheckCircle2", unsupportedInOPhim: true },
  { name: "Sắp Chiếu", slug: "phim-sap-chieu", icon: "Calendar", unsupportedInOPhim: true },
  { name: "Chiếu Rạp", slug: "phim-chieu-rap", icon: "Ticket" },
  { name: "Subteam", slug: "subteam", icon: "Users" },
];
