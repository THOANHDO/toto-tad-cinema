export type AuthErrorCode =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "user_banned"
  | "rate_limit"
  | "network_error"
  | "missing_configuration"
  | "account_not_allowed"
  | "account_disabled"
  | "unknown_error";

export interface SupabaseAuthErrorLike {
  code?: string;
  status?: number;
  message?: string;
  name?: string;
}

export function classifyAuthError(error: unknown): AuthErrorCode {
  if (!error) return "unknown_error";

  if (typeof error === "object" && error !== null) {
    const err = error as SupabaseAuthErrorLike;
    const code = (err.code || "").toLowerCase();
    const message = (err.message || "").toLowerCase();
    const name = (err.name || "").toLowerCase();
    const status = err.status;

    if (code === "missing_configuration" || message.includes("missing configuration")) {
      return "missing_configuration";
    }

    if (
      name.includes("typeerror") ||
      message.includes("failed to fetch") ||
      message.includes("networkerror") ||
      message.includes("network error")
    ) {
      return "network_error";
    }

    if (
      code === "over_email_send_rate_limit" ||
      code === "over_request_rate_limit" ||
      code === "rate_limit" ||
      status === 429 ||
      message.includes("rate limit") ||
      message.includes("too many requests")
    ) {
      return "rate_limit";
    }

    if (
      code === "user_banned" ||
      message.includes("user is banned") ||
      message.includes("banned")
    ) {
      return "user_banned";
    }

    if (
      code === "email_not_confirmed" ||
      message.includes("email not confirmed") ||
      message.includes("unconfirmed")
    ) {
      return "email_not_confirmed";
    }

    if (
      code === "invalid_credentials" ||
      code === "invalid_grant" ||
      status === 400 ||
      message.includes("invalid login credentials") ||
      message.includes("invalid credentials") ||
      message.includes("invalid grant")
    ) {
      return "invalid_credentials";
    }
  }

  return "unknown_error";
}

export function mapSupabaseAuthError(error: unknown): string {
  const category = classifyAuthError(error);

  switch (category) {
    case "missing_configuration":
      return "Dịch vụ đăng nhập chưa được cấu hình. Vui lòng liên hệ quản trị viên.";
    case "network_error":
      return "Không thể kết nối tới máy chủ xác thực. Vui lòng kiểm tra kết nối mạng.";
    case "rate_limit":
      return "Đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.";
    case "user_banned":
      return "Tài khoản này đã bị khóa.";
    case "email_not_confirmed":
      return "Email chưa được xác nhận.";
    case "invalid_credentials":
      return "Email hoặc mật khẩu không chính xác.";
    case "account_not_allowed":
      return "Tài khoản này chưa được cấp quyền truy cập.";
    case "account_disabled":
      return "Tài khoản này đã bị vô hiệu hóa";
    case "unknown_error":
    default:
      return "Lỗi hệ thống tạm thời. Vui lòng thử lại sau.";
  }
}
