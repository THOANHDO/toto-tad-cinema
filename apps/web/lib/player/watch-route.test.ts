import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
  getDefaultWatchEpisode,
  findWatchEpisode,
  normalizeEpisodeSlug,
  isValidEpisodeItem,
} from "./watch-helpers";

describe("Watch Route Helpers & Episode Selection", () => {
  test("1. Movie with episode Full creates correct watch URL", () => {
    const episodes = [
      {
        server_name: "Server #1",
        server_data: [
          { name: "Full", slug: "full", link_m3u8: "https://ophim.com/full.m3u8" },
        ],
      },
    ];

    const defaultEp = getDefaultWatchEpisode(episodes);
    assert.ok(defaultEp !== null);
    assert.equal(defaultEp?.slug, "full");
  });

  test("2. Movie with tap-1 creates correct watch URL", () => {
    const episodes = [
      {
        server_name: "Server #1",
        server_data: [
          { name: "Tập 01", slug: "tap-1", link_m3u8: "https://ophim.com/tap-1.m3u8" },
        ],
      },
    ];

    const defaultEp = getDefaultWatchEpisode(episodes);
    assert.ok(defaultEp !== null);
    assert.equal(defaultEp?.slug, "tap-1");
  });

  test("3. Movie slug is NOT used as episode slug", () => {
    const episodes = [
      {
        server_name: "Server #1",
        server_data: [
          { name: "Tập 1", slug: "tap-1", link_m3u8: "https://ophim.com/tap-1.m3u8" },
        ],
      },
    ];

    const movieSlug = "soulm8te";
    const defaultEp = getDefaultWatchEpisode(episodes);
    assert.notEqual(defaultEp?.slug, movieSlug);
    assert.equal(defaultEp?.slug, "tap-1");
  });

  test("4. Movie with no valid episode returns null (e.g. soulm8te trailer item)", () => {
    const soulm8teEpisodes = [
      {
        server_name: "Server #1",
        server_data: [
          { name: "", slug: "", filename: "", link_embed: "", link_m3u8: "" },
        ],
      },
    ];

    const defaultEp = getDefaultWatchEpisode(soulm8teEpisodes);
    assert.equal(defaultEp, null);
  });

  test("5. Lookup finds episode across multiple servers", () => {
    const episodes = [
      {
        server_name: "Server #1",
        server_data: [{ name: "Tập 1", slug: "tap-1", link_m3u8: "https://s1.m3u8" }],
      },
      {
        server_name: "Server #2",
        server_data: [{ name: "Tập 2", slug: "tap-2", link_m3u8: "https://s2.m3u8" }],
      },
    ];

    const match = findWatchEpisode(episodes, "tap-2");
    assert.ok(match !== null);
    assert.equal(match?.episode.slug, "tap-2");
    assert.equal(match?.serverIndex, 1);
  });

  test("6. Normalizes legacy and encoded episode slugs cleanly", () => {
    assert.equal(normalizeEpisodeSlug("tap-01"), "1");
    assert.equal(normalizeEpisodeSlug("tap-1"), "1");
    assert.equal(normalizeEpisodeSlug("1"), "1");
    assert.equal(normalizeEpisodeSlug("full"), "full");
  });

  test("7. Validates episode item with stream or embed URLs", () => {
    assert.equal(
      isValidEpisodeItem({ name: "Tập 1", slug: "tap-1", link_m3u8: "https://stream.m3u8" }),
      true
    );
    assert.equal(
      isValidEpisodeItem({ name: "", slug: "", link_m3u8: "" }),
      false
    );
  });
});
