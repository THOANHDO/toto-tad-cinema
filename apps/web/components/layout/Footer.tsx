import Link from "next/link";

export default function Footer() {
    return (
        <footer className="mt-auto border-t border-border bg-background-secondary/70">
            <div className="site-container flex flex-col gap-5 py-8 sm:flex-row sm:items-center sm:justify-between">
                <Link href="/" prefetch={false} className="text-sm font-semibold tracking-wide text-foreground">
                    ToTo TAD Media
                </Link>
                <div className="text-xs leading-relaxed text-foreground-muted sm:text-right">
                    <p>© {new Date().getFullYear()} ToTo TAD Media. Trải nghiệm xem phim dành cho cá nhân và gia đình.</p>
                    <p className="mt-1">Nội dung được tổng hợp từ các nguồn dữ liệu hiện có.</p>
                </div>
            </div>
        </footer>
    );
}
