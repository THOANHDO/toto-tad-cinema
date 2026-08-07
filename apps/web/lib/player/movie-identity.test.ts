import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
  normalizeTitle,
  extractMovieIdentity,
  scoreMovieMatch,
} from "./movie-identity";
import {
  parseEpisodeIdentity,
  matchEpisode,
} from "./episode-identity";

describe("Movie Identity Normalization & Matching Rules", () => {
  test("1. Same slug but completely different titles rejects match", () => {
    const anchor = extractMovieIdentity({ name: "Bi Kíp Nghịch Tập Của Thiếu Hiệp", year: 2024 });
    const candidate = extractMovieIdentity({ name: "Hút Thuốc Phía Sau Siêu Thị Cùng Em", year: 2024 });
    const result = scoreMovieMatch(anchor, candidate);
    assert.equal(result.isMatch, false);
    assert.equal(result.score < 60, true);
  });

  test("2. Same title but conflicting release year rejects match (year conflict penalty)", () => {
    const anchor = extractMovieIdentity({ name: "Ý Chí Kim Cương", year: 2024 });
    const candidate = extractMovieIdentity({ name: "Ý Chí Kim Cương", year: 2010 });
    const result = scoreMovieMatch(anchor, candidate);
    assert.equal(result.isMatch, false);
    assert.equal(result.score, 0);
  });

  test("3. Same title + same year accepts match", () => {
    const anchor = extractMovieIdentity({ name: "Ý Chí Kim Cương", year: 2024 });
    const candidate = extractMovieIdentity({ name: "Ý Chí Kim Cương", year: 2024 });
    const result = scoreMovieMatch(anchor, candidate);
    assert.equal(result.isMatch, true);
    assert.equal(result.score >= 70, true);
  });

  test("4. Exact IMDb ID match returns 100 confidence score", () => {
    const anchor = extractMovieIdentity({ name: "Movie A", imdb_id: "tt1234567" });
    const candidate = extractMovieIdentity({ name: "Movie A (Different Local Title)", imdb_id: "tt1234567" });
    const result = scoreMovieMatch(anchor, candidate);
    assert.equal(result.isMatch, true);
    assert.equal(result.score, 100);
    assert.equal(result.confidence, "exact");
  });

  test("5. Exact TMDb ID match returns 90 confidence score", () => {
    const anchor = extractMovieIdentity({ name: "Movie B", tmdb_id: "98765" });
    const candidate = extractMovieIdentity({ name: "Movie B", tmdb_id: "98765" });
    const result = scoreMovieMatch(anchor, candidate);
    assert.equal(result.isMatch, true);
    assert.equal(result.score, 90);
  });

  test("6. Normalizes titles stripping Vietnamese diacritics and special characters", () => {
    assert.equal(normalizeTitle("Hút Thuốc Phía Sau Siêu Thị Cùng Em!"), "hut thuoc phia sau sieu thi cung em");
    assert.equal(normalizeTitle("Bi Kíp Nghịch Tập Của Thiếu Hiệp (2024)"), "bi kip nghich tap cua thieu hiep 2024");
  });
});

describe("Canonical Episode Identity & Matching Rules", () => {
  test("7. Episode 'Tập 01' parses to episodeNumber 1", () => {
    const identity = parseEpisodeIdentity("tap-01", "Tập 01");
    assert.equal(identity.episodeNumber, 1);
  });

  test("8. Episode 'Episode 1' parses to episodeNumber 1", () => {
    const identity = parseEpisodeIdentity("episode-1", "Episode 1");
    assert.equal(identity.episodeNumber, 1);
  });

  test("9. Episode 10 does NOT match Episode 1", () => {
    const target = parseEpisodeIdentity("tap-1", "Tập 1");
    const candidateItems = [
      { slug: "tap-10", name: "Tập 10" },
      { slug: "tap-11", name: "Tập 11" },
    ];
    const match = matchEpisode(target, candidateItems, false);
    assert.equal(match, null);
  });

  test("10. Multi-episode series NEVER falls back to first episode when target is missing", () => {
    const target = parseEpisodeIdentity("tap-5", "Tập 5");
    const candidateItems = [
      { slug: "tap-1", name: "Tập 1" },
      { slug: "tap-2", name: "Tập 2" },
    ];
    const match = matchEpisode(target, candidateItems, false);
    assert.equal(match, null);
  });

  test("11. Single movie with 1 episode allows fallback ONLY for single episode movies", () => {
    const target = parseEpisodeIdentity("full", "Full");
    const candidateItems = [{ slug: "full", name: "Bản Đầy Đủ" }];
    const match = matchEpisode(target, candidateItems, true);
    assert.ok(match !== null);
    assert.equal(match?.confidence, "exact");
  });

  test("12. Episode 'EP.01' matches target episode 1", () => {
    const target = parseEpisodeIdentity("1", "Tập 1");
    const candidateItems = [{ slug: "ep-01", name: "EP.01" }];
    const match = matchEpisode(target, candidateItems, false);
    assert.ok(match !== null);
    assert.equal(match?.matchedItem.slug, "ep-01");
  });
});
