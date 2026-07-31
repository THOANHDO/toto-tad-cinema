"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    baseUrl: string;
}

export default function Pagination({ currentPage, totalPages, baseUrl }: PaginationProps) {
    // Ensure values are numbers
    const _totalPages = Number(totalPages) || 1;
    const _currentPage = Number(currentPage) || 1;

    if (_totalPages <= 1) return null;

    // Generate page numbers to show
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const showEllipsis = _totalPages > 7;

        if (!showEllipsis) {
            for (let i = 1; i <= _totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);

            if (_currentPage > 3) {
                pages.push("...");
            }

            // Show pages around current
            const start = Math.max(2, _currentPage - 1);
            const end = Math.min(_totalPages - 1, _currentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (_currentPage < _totalPages - 2) {
                pages.push("...");
            }

            // Always show last page
            if (_totalPages > 1) {
                pages.push(_totalPages);
            }
        }

        return pages;
    };

    // Preserve every active filter while changing only the page.
    const getPageUrl = (page: number) => {
        const [urlWithoutHash, hash] = baseUrl.split("#");
        const [path, queryString] = urlWithoutHash.split("?");
        const params = new URLSearchParams(queryString || "");

        params.set("page", page.toString());
        if (!params.has("limit")) params.set("limit", "24");

        const query = params.toString();
        const newUrl = `${path}${query ? `?${query}` : ""}`;
        return hash ? `${newUrl}#${hash}` : `${newUrl}#results`;
    };

    return (
        <nav className="mt-12 flex items-center justify-center gap-1" aria-label="Phân trang">
            {/* Previous button */}
            {_currentPage > 1 ? (
                <Link
                    href={getPageUrl(_currentPage - 1)}
                    prefetch={false}
                    className="flex h-10 items-center gap-1 rounded-lg border border-transparent px-3 text-sm text-foreground-secondary transition-colors hover:border-border hover:bg-white/5 hover:text-white md:h-11 xl:h-10"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Trước</span>
                </Link>
            ) : (
                <span className="flex h-10 cursor-not-allowed items-center gap-1 px-3 text-sm text-foreground-muted opacity-45 md:h-11 xl:h-10">
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Trước</span>
                </span>
            )}

            {/* Page numbers */}
            <div className="flex items-center gap-1">
                {getPageNumbers().map((page, index) =>
                    typeof page === "number" ? (
                        <Link
                            key={index}
                            href={getPageUrl(page)}
                            prefetch={false}
                            className={`flex h-10 min-w-10 items-center justify-center rounded-lg border text-sm transition-colors md:h-11 md:min-w-11 xl:h-10 xl:min-w-10 ${page === _currentPage
                                ? "border-primary bg-primary font-semibold text-[var(--primary-text)]"
                                : "border-transparent text-foreground-secondary hover:border-border hover:bg-white/5 hover:text-white"
                                }`}
                            aria-current={page === _currentPage ? "page" : undefined}
                        >
                            {page}
                        </Link>
                    ) : (
                        <span key={index} className="px-2 text-foreground-muted">
                            {page}
                        </span>
                    )
                )}
            </div>

            {/* Next button */}
            {_currentPage < _totalPages ? (
                <Link
                    href={getPageUrl(_currentPage + 1)}
                    prefetch={false}
                    className="flex h-10 items-center gap-1 rounded-lg border border-transparent px-3 text-sm text-foreground-secondary transition-colors hover:border-border hover:bg-white/5 hover:text-white md:h-11 xl:h-10"
                >
                    <span className="hidden sm:inline">Sau</span>
                    <ChevronRight className="w-4 h-4" />
                </Link>
            ) : (
                <span className="flex h-10 cursor-not-allowed items-center gap-1 px-3 text-sm text-foreground-muted opacity-45 md:h-11 xl:h-10">
                    <span className="hidden sm:inline">Sau</span>
                    <ChevronRight className="w-4 h-4" />
                </span>
            )}
        </nav>
    );
}
