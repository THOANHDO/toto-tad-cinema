"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="vi" className="dark">
      <body className="flex min-h-screen items-center justify-center bg-[#07080a] p-4 text-[#ededed] font-sans antialiased">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101114] p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-500">
            <svg
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="mt-5 text-xl font-bold tracking-tight text-white">
            Sự cố ứng dụng ngoài ý muốn
          </h1>
          <p className="mt-3 text-xs leading-relaxed text-[#9ca3af] sm:text-sm">
            Hệ thống đã tự động bảo vệ dữ liệu của bạn. Nhấn nút bên dưới để tải lại trang.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#e73343] px-5 text-xs font-semibold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-[#d02434] active:scale-[0.98]"
            >
              Thử lại ngay
            </button>
            <a
              href="/"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 text-xs font-semibold text-[#d1d5db] transition-all hover:bg-white/10 hover:text-white"
            >
              Về trang chủ
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
