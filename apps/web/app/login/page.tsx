import LoginForm from "./LoginForm";
import { getSafeNextPath } from "@/lib/auth/redirect";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập vào website xem phim riêng tư ToTo TAD Cinema.",
  robots: { index: false, follow: false },
};

interface LoginPageProps {
  searchParams: Promise<{
    next?: string | string[];
    error?: string | string[];
  }>;
}

const getInitialError = (value: string | string[] | undefined) => {
  const errorCode = Array.isArray(value) ? value[0] : value;

  if (errorCode === "account_disabled") {
    return "Tài khoản này đã bị vô hiệu hóa";
  }

  if (errorCode === "account_not_allowed") {
    return "Tài khoản này chưa được cấp quyền truy cập.";
  }

  return null;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextValue = Array.isArray(params.next) ? params.next[0] : params.next;

  return (
    <LoginForm
      nextPath={getSafeNextPath(nextValue)}
      initialError={getInitialError(params.error)}
    />
  );
}
