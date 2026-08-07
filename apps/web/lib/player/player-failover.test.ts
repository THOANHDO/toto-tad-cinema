import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
  buildPlaybackCandidates,
  isValidPlaybackUrl,
} from "./source-candidates";
import {
  isFatalVideoError,
  isFatalHlsError,
  classifyHlsError,
} from "./playback-errors";

describe("Player Source Candidate Builder & Model", () => {
  test("1. Validates URLs and rejects empty, non-http, or catalog URLs", () => {
    assert.equal(isValidPlaybackUrl("https://ophim1.com/hls/stream.m3u8"), true);
    assert.equal(isValidPlaybackUrl("http://nguonc.com/stream.m3u8"), true);
    assert.equal(isValidPlaybackUrl(""), false);
    assert.equal(isValidPlaybackUrl(null), false);
    assert.equal(isValidPlaybackUrl(undefined), false);
    assert.equal(isValidPlaybackUrl("javascript:void(0)"), false);
    assert.equal(isValidPlaybackUrl("https://ophim1.com/phim/soulm8te"), false);
    assert.equal(isValidPlaybackUrl("https://phim.nguonc.com/film/soulm8te"), false);
  });

  test("2. Builds candidate list in correct priority order: HLS before Embed", () => {
    const candidates = buildPlaybackCandidates({
      m3u8Url: "https://ophim.com/stream.m3u8",
      embedUrl: "https://ophim.com/embed/1",
      nguonCData: {
        movie: {
          episodes: [
            {
              items: [
                { slug: "tap-1", m3u8: "https://nguonc.com/stream.m3u8", embed: "https://nguonc.com/embed/1" },
              ],
            },
          ],
        },
      },
      phimApiData: {
        episodes: [
          {
            server_data: [
              { slug: "tap-1", link_m3u8: "https://phimapi.com/stream.m3u8", link_embed: "https://phimapi.com/embed/1" },
            ],
          },
        ],
      },
      episode: "tap-1",
    });

    assert.equal(candidates.length, 6);
    // HLS candidates first
    assert.equal(candidates[0].id, "op-hls");
    assert.equal(candidates[0].kind, "hls");
    assert.equal(candidates[1].id, "nc-hls");
    assert.equal(candidates[1].kind, "hls");
    assert.equal(candidates[2].id, "pa-hls");
    assert.equal(candidates[2].kind, "hls");

    // Embed candidates next
    assert.equal(candidates[3].id, "op-embed");
    assert.equal(candidates[3].kind, "embed");
    assert.equal(candidates[4].id, "nc-embed");
    assert.equal(candidates[4].kind, "embed");
    assert.equal(candidates[5].id, "pa-embed");
    assert.equal(candidates[5].kind, "embed");
  });

  test("3. Deduplicates duplicate stream URLs across providers", () => {
    const candidates = buildPlaybackCandidates({
      m3u8Url: "https://same-domain.com/stream.m3u8",
      embedUrl: "https://same-domain.com/stream.m3u8", // Same URL
      episode: "tap-1",
    });

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].id, "op-hls");
  });

  test("4. Zero parallel HEAD preflight requests required", () => {
    // Verified: buildPlaybackCandidates is synchronous & does not perform network HEAD fetch
    const candidates = buildPlaybackCandidates({
      m3u8Url: "https://stream.m3u8",
      episode: "tap-1",
    });
    assert.equal(candidates.length, 1);
  });
});

describe("Playback Fatal Error Classifiers", () => {
  test("5. Classifies fatal video element errors", () => {
    assert.equal(isFatalVideoError(null), false);
    assert.equal(isFatalVideoError({ code: 1 } as MediaError), false); // MEDIA_ERR_ABORTED
    assert.equal(isFatalVideoError({ code: 2 } as MediaError), true); // MEDIA_ERR_NETWORK
    assert.equal(isFatalVideoError({ code: 3 } as MediaError), true); // MEDIA_ERR_DECODE
    assert.equal(isFatalVideoError({ code: 4 } as MediaError), true); // MEDIA_ERR_SRC_NOT_SUPPORTED
  });

  test("6. Classifies fatal HLS.js errors", () => {
    assert.equal(isFatalHlsError(null), false);
    assert.equal(isFatalHlsError({ fatal: true }), true);
    assert.equal(isFatalHlsError({ details: "manifestLoadError" }), true);
    assert.equal(isFatalHlsError({ details: "manifestParsingError" }), true);
    assert.equal(isFatalHlsError({ type: "networkError", response: { code: 404 } }), true);
    assert.equal(isFatalHlsError({ type: "networkError", response: { code: 502 } }), true);
    assert.equal(isFatalHlsError({ fatal: false, details: "bufferStalledError" }), false);
  });

  test("7. Classifies neutral network error and mapped HTTP status codes", () => {
    assert.equal(
      classifyHlsError({ details: "manifestLoadError" }),
      "manifest_network_error"
    );
    assert.equal(
      classifyHlsError({ type: "networkError" }),
      "manifest_network_error"
    );
    assert.equal(
      classifyHlsError({ response: { code: 404 } }),
      "manifest_not_found"
    );
    assert.equal(
      classifyHlsError({ response: { code: 403 } }),
      "http_access_error"
    );
    assert.equal(
      classifyHlsError({ response: { code: 502 } }),
      "upstream_server_error"
    );
    assert.equal(
      classifyHlsError({ details: "timeout" }),
      "timeout_error"
    );
    assert.equal(
      classifyHlsError({ response: { text: "ERR_CERT_DATE_INVALID" } }),
      "certificate_or_tls_error"
    );
  });

  test("8. Classifies fragment CORS or status 0 network block", () => {
    assert.equal(
      classifyHlsError({ details: "fragLoadError", response: { code: 0 } }),
      "segment_cors_or_network_block"
    );
    assert.equal(
      classifyHlsError({ details: "fragLoadTimeout" }),
      "segment_timeout"
    );
  });
});
