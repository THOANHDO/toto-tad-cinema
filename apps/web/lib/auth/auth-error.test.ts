import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { mapSupabaseAuthError, classifyAuthError } from "./error-mapping";
import { getSafeNextPath } from "./redirect";
import { validateSupabaseEnv } from "../supabase/env";

describe("Supabase Auth Error Mapping", () => {
  test("classifies invalid credentials correctly", () => {
    assert.equal(
      classifyAuthError({ code: "invalid_credentials", message: "Invalid login credentials" }),
      "invalid_credentials"
    );
    assert.equal(
      classifyAuthError({ code: "invalid_grant", message: "Invalid grant" }),
      "invalid_credentials"
    );
    assert.equal(
      mapSupabaseAuthError({ code: "invalid_credentials" }),
      "Email hoặc mật khẩu không chính xác."
    );
  });

  test("classifies email not confirmed correctly", () => {
    assert.equal(
      classifyAuthError({ code: "email_not_confirmed", message: "Email not confirmed" }),
      "email_not_confirmed"
    );
    assert.equal(
      mapSupabaseAuthError({ code: "email_not_confirmed" }),
      "Email chưa được xác nhận."
    );
  });

  test("classifies user banned correctly", () => {
    assert.equal(
      classifyAuthError({ code: "user_banned", message: "User is banned" }),
      "user_banned"
    );
    assert.equal(
      mapSupabaseAuthError({ code: "user_banned" }),
      "Tài khoản này đã bị khóa."
    );
  });

  test("classifies rate limit correctly", () => {
    assert.equal(
      classifyAuthError({ code: "over_request_rate_limit", status: 429 }),
      "rate_limit"
    );
    assert.equal(
      mapSupabaseAuthError({ code: "over_request_rate_limit" }),
      "Đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau."
    );
  });

  test("classifies network errors correctly", () => {
    assert.equal(
      classifyAuthError(new TypeError("Failed to fetch")),
      "network_error"
    );
    assert.equal(
      mapSupabaseAuthError(new TypeError("Failed to fetch")),
      "Không thể kết nối tới máy chủ xác thực. Vui lòng kiểm tra kết nối mạng."
    );
  });

  test("classifies missing configuration correctly", () => {
    assert.equal(
      classifyAuthError({ code: "missing_configuration", message: "Missing configuration" }),
      "missing_configuration"
    );
    assert.equal(
      mapSupabaseAuthError({ code: "missing_configuration" }),
      "Dịch vụ đăng nhập chưa được cấu hình. Vui lòng liên hệ quản trị viên."
    );
  });

  test("handles unknown errors with friendly message", () => {
    assert.equal(
      mapSupabaseAuthError({ code: "random_unknown_code" }),
      "Lỗi hệ thống tạm thời. Vui lòng thử lại sau."
    );
    assert.equal(
      mapSupabaseAuthError(null),
      "Lỗi hệ thống tạm thời. Vui lòng thử lại sau."
    );
  });
});

describe("Supabase Env Validator", () => {
  test("detects missing keys when process.env is empty", () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const result = validateSupabaseEnv();
    assert.equal(result.configured, false);
    assert.equal(result.missingKeys.includes("NEXT_PUBLIC_SUPABASE_URL"), true);
    assert.equal(result.missingKeys.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"), true);

    // Restore
    if (originalUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  });

  test("validates URL format", () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-valid-url";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "dummy-key";

    const result = validateSupabaseEnv();
    assert.equal(result.configured, false);
    assert.equal(result.invalidKeys.includes("NEXT_PUBLIC_SUPABASE_URL"), true);

    // Restore
    if (originalUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    else delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (originalKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
    else delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });
});

describe("Safe Redirect (getSafeNextPath)", () => {
  test("accepts valid internal paths", () => {
    assert.equal(getSafeNextPath("/"), "/");
    assert.equal(getSafeNextPath("/phim/test"), "/phim/test");
    assert.equal(
      getSafeNextPath("/xem-phim/test/tap-1?sv=2#player"),
      "/xem-phim/test/tap-1?sv=2#player"
    );
  });

  test("rejects external origins and protocol-relative URLs", () => {
    assert.equal(getSafeNextPath("https://evil.example.com"), null);
    assert.equal(getSafeNextPath("//evil.example.com"), null);
    assert.equal(getSafeNextPath("javascript:alert(1)"), null);
    assert.equal(getSafeNextPath("/\\evil.example.com"), null);
  });
});
