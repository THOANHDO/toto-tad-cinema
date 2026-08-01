import assert from "node:assert/strict";
import test from "node:test";
import { getSafeNextPath } from "./redirect";

test("accepts internal paths and preserves query/hash", () => {
  assert.equal(getSafeNextPath("/phim/test"), "/phim/test");
  assert.equal(
    getSafeNextPath("/xem-phim/test/tap-1?sv=2#player"),
    "/xem-phim/test/tap-1?sv=2#player",
  );
});

test("rejects external and protocol-relative redirects", () => {
  assert.equal(getSafeNextPath("https://evil.example"), null);
  assert.equal(getSafeNextPath("//evil.example"), null);
  assert.equal(getSafeNextPath("/\\evil.example"), null);
  assert.equal(getSafeNextPath("javascript:alert(1)"), null);
});

test("falls back for missing or malformed input", () => {
  assert.equal(getSafeNextPath(null), null);
  assert.equal(getSafeNextPath(""), null);
  assert.equal(getSafeNextPath("phim/test"), null);
  assert.equal(getSafeNextPath("/phim/test\u0000"), null);
});
