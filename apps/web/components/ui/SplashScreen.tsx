"use client";

import { Film } from "lucide-react";

export default function SplashScreen() {
    return (
        <div className="flex min-h-[70vh] items-center justify-center bg-background px-4" role="status">
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-background-secondary shadow-[var(--shadow-md)]">
                    <Film className="h-6 w-6 text-primary" />
                    <span className="absolute -inset-px animate-pulse rounded-2xl ring-1 ring-primary/30" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-foreground">Đang chuẩn bị nội dung</p>
                    <p className="mt-1 text-xs text-foreground-muted">ToTo TAD Cinema</p>
                </div>
            </div>
        </div>
    );
}
