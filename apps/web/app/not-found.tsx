import Link from "next/link";
import { Compass, Film } from "lucide-react";

export default function NotFound() {
    return (
        <div className="flex min-h-[78vh] items-center justify-center px-4 pb-16 pt-24">
            <div className="max-w-md text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-background-secondary text-primary">
                    <Film className="h-7 w-7" />
                </div>
                <p className="eyebrow mt-6">Lỗi 404</p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-white sm:text-4xl">
                    Không tìm thấy trang
                </h1>
                <p className="mt-3 text-sm leading-6 text-foreground-secondary">
                    Đường dẫn có thể đã thay đổi hoặc nội dung không còn khả dụng.
                </p>
                <Link href="/" className="button-primary mt-7">
                    <Compass className="h-4 w-4" />
                    Về trang chủ
                </Link>
            </div>
        </div>
    );
}
