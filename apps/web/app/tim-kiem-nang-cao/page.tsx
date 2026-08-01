import type { Metadata } from "next";
import { AlertTriangle, Search, SearchX } from "lucide-react";
import AdvancedSearchForm from "@/components/search/AdvancedSearchForm";
import MovieGrid from "@/components/movie/MovieGrid";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import { advancedSearch, getCategories, getCountries, movieTypes } from "@/lib/api/ophim";

type QueryValue = string | string[] | undefined;

interface Props {
    searchParams: Promise<{
        q?: QueryValue;
        category?: QueryValue;
        genre?: QueryValue;
        country?: QueryValue;
        type?: QueryValue;
        year?: QueryValue;
        page?: QueryValue;
        limit?: QueryValue;
    }>;
}

interface Option {
    name: string;
    slug: string;
}

interface PaginationData {
    pageRanges?: number;
    currentPage?: number;
    totalItems?: number;
    totalItemsPerPage?: number;
}

const readSingleValue = (value: QueryValue) => {
    const rawValue = Array.isArray(value) ? value[0] : value;
    return rawValue?.split(",")[0]?.trim() || "";
};

const readPositiveInteger = (value: QueryValue, fallback: number) => {
    const parsedValue = Number.parseInt(readSingleValue(value), 10);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
};

const getOptionName = (options: Option[], slug: string) =>
    options.find((option) => option.slug === slug)?.name || slug;

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: "Tìm kiếm nâng cao",
        description: "Lọc và tìm kiếm phim theo tên, quốc gia, thể loại và danh sách.",
    };
}

export default async function AdvancedSearchPage({ searchParams }: Props) {
    const params = await searchParams;
    const keyword = readSingleValue(params.q);
    const category = readSingleValue(params.category || params.genre);
    const country = readSingleValue(params.country);
    const type = readSingleValue(params.type);
    const year = readSingleValue(params.year);
    const page = readPositiveInteger(params.page, 1);
    const limit = readPositiveInteger(params.limit, 24);

    const [genresData, countriesData] = await Promise.all([
        getCategories(),
        getCountries(),
    ]);

    const genres: Option[] = genresData?.data?.items || [];
    const countries: Option[] = countriesData?.data?.items || [];
    const types: Option[] = movieTypes.map(({ name, slug }) => ({ name, slug }));

    const hasFacetFilters = Boolean(category || country || type || year);
    const hasSearchCriteria = Boolean(keyword || hasFacetFilters);
    const hasUnsupportedCombination = Boolean(keyword && hasFacetFilters);

    let movies = [];
    let pagination: PaginationData = {
        pageRanges: 1,
        currentPage: 1,
        totalItems: 0,
        totalItemsPerPage: limit,
    };
    let hasError = false;

    if (hasSearchCriteria && !hasUnsupportedCombination) {
        try {
            const searchData = await advancedSearch({
                keyword,
                category,
                country,
                type,
                year,
                page,
                limit,
            });
            movies = searchData?.data?.items || [];
            pagination = searchData?.data?.params?.pagination || pagination;
        } catch (error) {
            console.error("Advanced search failed:", error);
            hasError = true;
        }
    }

    const totalItems = pagination.totalItems || movies.length;
    const itemsPerPage = pagination.totalItemsPerPage || limit;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    const baseUrlParams = new URLSearchParams();
    if (keyword) baseUrlParams.set("q", keyword);
    if (type) baseUrlParams.set("type", type);
    if (category) baseUrlParams.set("category", category);
    if (country) baseUrlParams.set("country", country);
    if (year) baseUrlParams.set("year", year);
    baseUrlParams.set("limit", limit.toString());
    const baseUrl = `/tim-kiem-nang-cao?${baseUrlParams.toString()}`;

    const appliedFilters = [
        keyword ? { label: "Từ khóa", value: `“${keyword}”` } : null,
        type ? { label: "Loại phim", value: getOptionName(types, type) } : null,
        category
            ? { label: "Thể loại", value: getOptionName(genres, category) }
            : null,
        country
            ? { label: "Quốc gia", value: getOptionName(countries, country) }
            : null,
        year ? { label: "Năm", value: year } : null,
    ].filter((filter): filter is { label: string; value: string } => Boolean(filter));

    return (
        <div className="page-shell">
            <PageHeader
                eyebrow="Bộ lọc phim"
                title="Tìm kiếm nâng cao"
                description="Tìm theo từ khóa hoặc thu hẹp danh sách bằng loại phim, thể loại, quốc gia và năm phát hành."
            />

            <AdvancedSearchForm
                key={[keyword, category, country, type, year].join("|")}
                genres={genres}
                countries={countries}
                types={types}
                initialValues={{ keyword, category, country, type, year }}
            />

            <section id="results" className="scroll-mt-24 space-y-6" aria-labelledby="results-title">
                <div className="space-y-4 border-b border-border pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 id="results-title" className="text-xl font-bold tracking-tight">
                            Kết quả tìm kiếm
                        </h2>
                        {hasSearchCriteria && !hasUnsupportedCombination && !hasError && (
                            <span className="rounded-full border border-border bg-white/5 px-2.5 py-1 text-xs font-medium text-foreground-muted">
                                {totalItems.toLocaleString("vi-VN")} phim
                            </span>
                        )}
                    </div>

                    {appliedFilters.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2" aria-label="Bộ lọc đang áp dụng">
                            <span className="mr-1 text-xs font-semibold uppercase tracking-[0.12em] text-foreground-muted">
                                Đang lọc
                            </span>
                            {appliedFilters.map((filter) => (
                                <span
                                    key={filter.label}
                                    className="rounded-full border border-border bg-white/5 px-3 py-1.5 text-xs text-foreground-secondary"
                                >
                                    <span className="text-foreground-muted">{filter.label}:</span>{" "}
                                    {filter.value}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {hasUnsupportedCombination ? (
                    <EmptyState
                        icon={<AlertTriangle className="h-5 w-5" />}
                        title="Chưa thể kết hợp hai cách tìm kiếm"
                        description="Nguồn phim hiện chưa hỗ trợ tìm theo tên kết hợp cùng bộ lọc. Bạn có thể tìm theo tên phim hoặc sử dụng bộ lọc để khám phá phim phù hợp."
                    />
                ) : hasError ? (
                    <EmptyState
                        icon={<AlertTriangle className="h-5 w-5" />}
                        title="Tìm kiếm đang tạm gián đoạn"
                        description="Không thể kết nối với nguồn phim. Vui lòng thử lại sau."
                    />
                ) : !hasSearchCriteria ? (
                    <EmptyState
                        icon={<Search className="h-5 w-5" />}
                        title="Chọn phim theo cách của bạn"
                        description="Nhập từ khóa hoặc chọn các bộ lọc phía trên, sau đó nhấn Tìm kiếm."
                    />
                ) : movies.length > 0 ? (
                    <>
                        <MovieGrid movies={movies} />
                        <Pagination
                            currentPage={pagination.currentPage || page}
                            totalPages={totalPages}
                            baseUrl={baseUrl}
                        />
                    </>
                ) : (
                    <EmptyState
                        icon={<SearchX className="h-5 w-5" />}
                        title="Không tìm thấy phim phù hợp"
                        description="Thử giảm số bộ lọc hoặc thay đổi từ khóa để mở rộng kết quả."
                    />
                )}
            </section>
        </div>
    );
}
