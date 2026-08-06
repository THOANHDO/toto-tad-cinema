import assert from "node:assert";
import { test, describe } from "node:test";
import { resolveOPhimImageUrl, UNSUPPORTED_OPHIM_SLUGS, getMoviesByType } from "./ophim";

describe("Image Resolver (resolveOPhimImageUrl)", () => {
  test("returns placeholder for null, undefined, or empty string", () => {
    assert.strictEqual(resolveOPhimImageUrl(null), "/placeholder.jpg");
    assert.strictEqual(resolveOPhimImageUrl(undefined), "/placeholder.jpg");
    assert.strictEqual(resolveOPhimImageUrl(""), "/placeholder.jpg");
    assert.strictEqual(resolveOPhimImageUrl("   "), "/placeholder.jpg");
  });

  test("preserves absolute HTTP/HTTPS URLs", () => {
    const httpUrl = "http://example.com/image.jpg";
    const httpsUrl = "https://phimimg.com/uploads/movies/avatar.jpg";
    assert.strictEqual(resolveOPhimImageUrl(httpUrl), httpUrl);
    assert.strictEqual(resolveOPhimImageUrl(httpsUrl), httpsUrl);
  });

  test("formats uploads/movies path without duplication", () => {
    const input = "uploads/movies/conan.jpg";
    assert.strictEqual(
      resolveOPhimImageUrl(input),
      "https://img.ophim.live/uploads/movies/conan.jpg"
    );
  });

  test("strips duplicate uploads/movies/uploads/movies prefix", () => {
    const input = "uploads/movies/uploads/movies/conan.jpg";
    assert.strictEqual(
      resolveOPhimImageUrl(input),
      "https://img.ophim.live/uploads/movies/conan.jpg"
    );
  });

  test("formats filename path correctly", () => {
    const input = "doraemon.jpg";
    assert.strictEqual(
      resolveOPhimImageUrl(input),
      "https://img.ophim.live/uploads/movies/doraemon.jpg"
    );
  });

  test("trims leading slashes", () => {
    const input = "/uploads/movies/naruto.jpg";
    assert.strictEqual(
      resolveOPhimImageUrl(input),
      "https://img.ophim.live/uploads/movies/naruto.jpg"
    );
  });

  test("supports custom baseUrl parameter", () => {
    const input = "naruto.jpg";
    const customBase = "https://custom.cdn.com";
    assert.strictEqual(
      resolveOPhimImageUrl(input, customBase),
      "https://custom.cdn.com/uploads/movies/naruto.jpg"
    );
  });
});

describe("Unsupported OPhim Slugs Protection", () => {
  test("contains known 404 slugs", () => {
    assert.strictEqual(UNSUPPORTED_OPHIM_SLUGS.has("phim-bo-dang-chieu"), true);
    assert.strictEqual(UNSUPPORTED_OPHIM_SLUGS.has("phim-bo-hoan-thanh"), true);
    assert.strictEqual(UNSUPPORTED_OPHIM_SLUGS.has("phim-sap-chieu"), true);
  });

  test("getMoviesByType returns empty result for unsupported slugs without throwing", async () => {
    const res = await getMoviesByType("phim-bo-dang-chieu", 1);
    assert.deepStrictEqual(res, {
      data: { items: [], params: { pagination: { totalItems: 0 } } },
    });
  });
});
