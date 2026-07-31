"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, Home, RefreshCw } from "lucide-react";

export default function MovieError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex min-h-[78vh] items-center justify-center bg-background px-4 pb-16 pt-24">
            <div className="surface-panel max-w-md p-7 text-center sm:p-9">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-error/25 bg-error/10 text-error">
                    <AlertCircle className="h-6 w-6" />
                </div>
                <h1 className="mt-5 text-2xl font-bold tracking-tight">Không thể tải thông tin phim</h1>
                <p className="mt-3 text-sm leading-6 text-foreground-secondary">
                    Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={reset}
                        className="button-primary"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Thử lại
                    </button>
                    <Link
                        href="/"
                        className="button-ghost"
                    >
                        <Home className="h-4 w-4" />
                        Về trang chủ
                    </Link>
                </div>
            </div>
        </div>
    );
}
