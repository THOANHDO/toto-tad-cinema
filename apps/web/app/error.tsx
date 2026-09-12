"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, Home, RefreshCw } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RootError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4 py-16">
      <div className="surface-panel max-w-md p-7 text-center sm:p-9">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-error/25 bg-error/10 text-error">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-xl font-bold tracking-tight text-white sm:text-2xl">
          Đã xảy ra lỗi kết nối
        </h1>
        <p className="mt-3 text-xs leading-relaxed text-foreground-secondary sm:text-sm">
          Trang web gặp sự cố tạm thời khi tải dữ liệu hoặc phiên làm việc bị gián đoạn.
          Bạn có thể nhấn thử lại để tiếp tục xem.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="button-primary min-h-10 gap-2 px-4 text-xs font-semibold"
          >
            <RefreshCw className="h-4 w-4" />
            Thử lại
          </button>
          <Link
            href="/"
            className="button-ghost min-h-10 gap-2 px-4 text-xs font-semibold"
          >
            <Home className="h-4 w-4" />
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
