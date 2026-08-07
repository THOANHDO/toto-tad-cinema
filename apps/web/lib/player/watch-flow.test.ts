import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { resolveMultiProviderMovies } from "./provider-resolution";
import { buildSourceInventory } from "./source-inventory";
import { extractMovieIdentity } from "./movie-identity";

describe("Watch Flow Stability & Provider Resolution", () => {
  test("1. Provider 404 returns not_found status without throwing errors", async () => {
    const res = await resolveMultiProviderMovies("non-existent-movie-slug-12345");
    assert.equal(res.movieSlug, "non-existent-movie-slug-12345");
    assert.equal(res.ophim?.status, "not_found");
    assert.equal(res.nguonc?.status, "not_found");
    assert.equal(res.phimapi?.status, "not_found");
    assert.equal(res.primaryMovie, undefined);
  });

  test("2. Provider 404 does not retry or throw exceptions", async () => {
    const res = await resolveMultiProviderMovies("slug-404-test");
    assert.ok(res !== null);
    assert.equal(res.ophim?.status, "not_found");
  });

  test("3. Builds stable source inventory for valid resolution", () => {
    const primaryMovie = { name: "Hút Thuốc Phía Sau Siêu Thị Cùng Em" };
    const resolution = {
      movieSlug: "hut-thuoc-phia-sau-sieu-thi-cung-em",
      anchorIdentity: extractMovieIdentity(primaryMovie),
      primaryMovie,
      ophim: {
        provider: "ophim" as const,
        status: "found" as const,
        episodes: [
          {
            server_name: "Server #1",
            server_data: [
              {
                slug: "1",
                link_m3u8: "https://opstream.com/1.m3u8",
                link_embed: "https://opstream.com/embed/1",
              },
            ],
          },
        ],
      },
      nguonc: { provider: "nguonc" as const, status: "not_found" as const },
      phimapi: { provider: "phimapi" as const, status: "not_found" as const },
    };

    const inventory = buildSourceInventory(resolution, "1");
    assert.equal(inventory.episodeKey, "hut-thuoc-phia-sau-sieu-thi-cung-em:1");
    assert.equal(inventory.sources.length, 2);
    assert.equal(inventory.sources[0].id, "op-hls");
    assert.equal(inventory.sources[1].id, "op-embed");
    assert.equal(inventory.unavailableProviders.includes("nguonc"), true);
    assert.equal(inventory.unavailableProviders.includes("phimapi"), true);
  });

  test("4. Empty resolution or episode returns empty sources array without player crash", () => {
    const inventory = buildSourceInventory(null, "1");
    assert.equal(inventory.sources.length, 0);
  });

  test("5. Stable episode key memoization across re-renders", () => {
    const primaryMovie = { name: "Test Movie" };
    const resolution = {
      movieSlug: "test-slug",
      anchorIdentity: extractMovieIdentity(primaryMovie),
      primaryMovie,
    };

    const inv1 = buildSourceInventory(resolution, "1");
    const inv2 = buildSourceInventory(resolution, "1");

    assert.equal(inv1.episodeKey, inv2.episodeKey);
    assert.equal(inv1.sources.length, inv2.sources.length);
  });
});
