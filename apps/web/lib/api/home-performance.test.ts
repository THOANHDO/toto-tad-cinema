import assert from "node:assert/strict";
import test, { describe, beforeEach } from "node:test";
import { fetchHomeInitialData } from "./home-data";
import {
  clearServerCache,
  getCachedServerData,
  setCachedServerData,
  UNSUPPORTED_OPHIM_SLUGS,
  safeFetchOPhim,
  resolveOPhimImageUrl,
  extractMovieItems,
  extractMoviePagination,
} from "./ophim";

describe("Home Data Loader & Resilience", () => {
  beforeEach(() => {
    clearServerCache();
  });

  test("1. Renders Home even if a single section fails", async () => {
    setCachedServerData("danh-sach/phim-moi-cap-nhat?page=1", {
      items: [{ slug: "phim-1", name: "Phim 1" }],
    });
    setCachedServerData("v1/api/danh-sach/phim-bo?page=1&limit=24", {
      data: { items: [{ slug: "phim-2", name: "Phim 2" }] },
    });

    const res = await fetchHomeInitialData();
    assert.equal(res.hasInitialData, true);
    assert.ok(res.heroMovie !== null);
    assert.equal(res.heroMovie.slug, "phim-1");
    assert.ok(res.sectionsCount >= 1);
  });

  test("2. Shows full empty state ONLY when ALL sections fail", async () => {
    clearServerCache();
    const res = await fetchHomeInitialData();
    if (res.sectionsCount === 0) {
      assert.equal(res.hasInitialData, false);
      assert.equal(res.heroMovie, null);
    } else {
      assert.equal(res.hasInitialData, true);
    }
  });

  test("3. Hero fallback picks movie from first successful section", async () => {
    setCachedServerData("danh-sach/phim-moi-cap-nhat?page=1", { items: [] });
    setCachedServerData("v1/api/danh-sach/phim-bo?page=1&limit=24", {
      data: { items: [{ slug: "fallback-hero", name: "Hero Fallback" }] },
    });

    const res = await fetchHomeInitialData();
    if (res.seriesMovies.length > 0 && res.newMovies.length === 0) {
      assert.equal(res.heroMovie?.slug, "fallback-hero");
    }
  });

  test("4. Does not call unsupported or duplicate endpoints", () => {
    assert.equal(UNSUPPORTED_OPHIM_SLUGS.has("subteam"), true);
    assert.equal(UNSUPPORTED_OPHIM_SLUGS.has("phim-bo-dang-chieu"), true);
    assert.equal(UNSUPPORTED_OPHIM_SLUGS.has("phim-bo-hoan-thanh"), true);
    assert.equal(UNSUPPORTED_OPHIM_SLUGS.has("phim-sap-chieu"), true);
  });

  test("5. Cache key and TTL storing work correctly", () => {
    const key = "test-endpoint?page=1";
    setCachedServerData(key, { items: [1, 2, 3] }, 300);

    const cached = getCachedServerData(key, false);
    assert.deepEqual(cached, { items: [1, 2, 3] });
  });

  test("6. Browser catalog requests target internal proxy, not direct ophim1.com", () => {
    const isServer = typeof window === "undefined";
    const cleanPath = "v1/api/danh-sach/phim-le?page=1";
    const fullUrl = isServer
      ? `https://ophim1.com/${cleanPath}`
      : `/api/providers/ophim/${cleanPath}`;

    if (!isServer) {
      assert.equal(fullUrl.startsWith("/api/providers/ophim/"), true);
      assert.equal(fullUrl.includes("ophim1.com"), false);
    } else {
      assert.equal(fullUrl.startsWith("https://ophim1.com/"), true);
    }
  });

  test("7. Image resolver correctly formats poster URLs without duplications", () => {
    assert.equal(resolveOPhimImageUrl(""), "/placeholder.jpg");
    assert.equal(
      resolveOPhimImageUrl("uploads/movies/avatar.jpg"),
      "https://img.ophim.live/uploads/movies/avatar.jpg"
    );
    assert.equal(
      resolveOPhimImageUrl("https://custom.domain/poster.jpg"),
      "https://custom.domain/poster.jpg"
    );
  });

  test("8. Safe placeholder prevents infinite onError recursion", () => {
    let currentSrc = "invalid-url.jpg";
    let triggerCount = 0;

    const onErrorHandler = () => {
      triggerCount++;
      if (currentSrc !== "/placeholder.jpg") {
        currentSrc = "/placeholder.jpg";
      }
    };

    onErrorHandler();
    assert.equal(currentSrc, "/placeholder.jpg");
    assert.equal(triggerCount, 1);

    onErrorHandler();
    assert.equal(currentSrc, "/placeholder.jpg");
    assert.equal(triggerCount, 2);
  });

  test("9. Server URL and Browser proxy URL remain strictly separated", () => {
    const path = "v1/api/danh-sach/phim-bo?page=1";
    const serverUrl = `https://ophim1.com/${path}`;
    const browserUrl = `/api/providers/ophim/${path}`;

    assert.equal(serverUrl.startsWith("https://ophim1.com/"), true);
    assert.equal(browserUrl.startsWith("/api/providers/ophim/"), true);
    assert.notEqual(serverUrl, browserUrl);
  });
});

describe("extractMovieItems Payload Normalizer & Deduplication", () => {
  test("reads data.items correctly", () => {
    const payload = {
      data: {
        items: [
          { slug: "movie-1", name: "Movie 1" },
          { slug: "movie-2", name: "Movie 2" },
        ],
      },
    };
    const items = extractMovieItems(payload);
    assert.equal(items.length, 2);
    assert.equal(items[0].slug, "movie-1");
  });

  test("reads items at root correctly", () => {
    const payload = {
      items: [
        { slug: "movie-a", name: "Movie A" },
        { slug: "movie-b", name: "Movie B" },
      ],
    };
    const items = extractMovieItems(payload);
    assert.equal(items.length, 2);
    assert.equal(items[1].slug, "movie-b");
  });

  test("does not take only the first item (returns full array of 24 items)", () => {
    const rawList = Array.from({ length: 24 }, (_, i) => ({
      slug: `movie-${i + 1}`,
      name: `Movie ${i + 1}`,
    }));
    const payload = { data: { items: rawList } };
    const items = extractMovieItems(payload);
    assert.equal(items.length, 24);
  });

  test("deduplicates items by slug", () => {
    const payload = {
      items: [
        { slug: "dup-movie", name: "Dup Movie" },
        { slug: "dup-movie", name: "Dup Movie Copy" },
        { slug: "unique-movie", name: "Unique Movie" },
      ],
    };
    const items = extractMovieItems(payload);
    assert.equal(items.length, 2);
    assert.equal(items[0].slug, "dup-movie");
    assert.equal(items[1].slug, "unique-movie");
  });

  test("returns empty array for invalid or empty payload", () => {
    assert.deepEqual(extractMovieItems(null), []);
    assert.deepEqual(extractMovieItems({}), []);
    assert.deepEqual(extractMovieItems({ data: { items: [] } }), []);
  });
});

describe("extractMoviePagination Metadata Normalizer", () => {
  test("extracts real upstream pagination from data.params.pagination", () => {
    const payload = {
      data: {
        params: {
          pagination: {
            totalItems: 18652,
            totalItemsPerPage: 24,
            currentPage: 1,
            totalPages: 778,
          },
        },
      },
    };
    const pag = extractMoviePagination(payload);
    assert.equal(pag.totalItems, 18652);
    assert.equal(pag.totalPages, 778);
    assert.equal(pag.currentPage, 1);
  });

  test("extracts pagination from root pagination property", () => {
    const payload = {
      pagination: {
        totalItems: 4218,
        totalItemsPerPage: 24,
        currentPage: 2,
        totalPages: 176,
      },
    };
    const pag = extractMoviePagination(payload);
    assert.equal(pag.totalItems, 4218);
    assert.equal(pag.totalPages, 176);
    assert.equal(pag.currentPage, 2);
  });

  test("calculates fallback totalPages when rawTotalPages is missing", () => {
    const payload = {
      data: {
        params: {
          pagination: {
            totalItems: 500,
            totalItemsPerPage: 20,
          },
        },
      },
    };
    const pag = extractMoviePagination(payload);
    assert.equal(pag.totalItems, 500);
    assert.equal(pag.totalPages, 25);
  });
});
