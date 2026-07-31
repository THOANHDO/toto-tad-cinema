"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, RotateCcw, Search } from "lucide-react";

interface Option {
    name: string;
    slug: string;
}

interface AdvancedSearchFormProps {
    genres: Option[];
    countries: Option[];
    types: Option[];
    initialValues: {
        keyword: string;
        category: string;
        country: string;
        type: string;
        year: string;
    };
}

interface FilterGroupProps {
    label: string;
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    scrollable?: boolean;
}

function FilterGroup({
    label,
    options,
    value,
    onChange,
    scrollable = false,
}: FilterGroupProps) {
    return (
        <fieldset className="min-w-0 space-y-3">
            <legend className="text-xs font-bold uppercase tracking-[0.14em] text-foreground-muted">
                {label}
            </legend>
            <div
                className={`grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 ${
                    scrollable ? "max-h-52 overflow-y-auto pr-1" : ""
                }`}
            >
                <button
                    type="button"
                    onClick={() => onChange("")}
                    aria-pressed={!value}
                    className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                        !value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-foreground-secondary hover:border-border-strong hover:text-white"
                    }`}
                >
                    <span
                        className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border transition-colors ${
                            !value ? "border-primary bg-primary" : "border-foreground-muted"
                        }`}
                    >
                        {!value && (
                            <Check
                                aria-hidden="true"
                                className="h-3 w-3 text-[var(--primary-text)]"
                            />
                        )}
                    </span>
                    <span className="truncate">Tất cả</span>
                </button>

                {options.map((option) => {
                    const isSelected = value === option.slug;

                    return (
                        <button
                            key={option.slug}
                            type="button"
                            onClick={() => onChange(isSelected ? "" : option.slug)}
                            aria-pressed={isSelected}
                            className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                                isSelected
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border bg-background text-foreground-secondary hover:border-border-strong hover:text-white"
                            }`}
                        >
                            <span
                                className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border transition-colors ${
                                    isSelected
                                        ? "border-primary bg-primary"
                                        : "border-foreground-muted"
                                }`}
                            >
                                {isSelected && (
                                    <Check
                                        aria-hidden="true"
                                        className="h-3 w-3 text-[var(--primary-text)]"
                                    />
                                )}
                            </span>
                            <span className="truncate">{option.name}</span>
                        </button>
                    );
                })}
            </div>
        </fieldset>
    );
}

export default function AdvancedSearchForm({
    genres,
    countries,
    types,
    initialValues,
}: AdvancedSearchFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [keyword, setKeyword] = useState(initialValues.keyword);
    const [category, setCategory] = useState(initialValues.category);
    const [country, setCountry] = useState(initialValues.country);
    const [type, setType] = useState(initialValues.type);
    const [year, setYear] = useState(initialValues.year);

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 30 }, (_, index) =>
        (currentYear - index).toString()
    );
    const hasDraftFilters = Boolean(keyword.trim() || category || country || type || year);

    const handleSearch = (event: React.FormEvent) => {
        event.preventDefault();

        const params = new URLSearchParams();
        const trimmedKeyword = keyword.trim();

        if (trimmedKeyword) params.set("q", trimmedKeyword);
        if (type) params.set("type", type);
        if (category) params.set("category", category);
        if (country) params.set("country", country);
        if (year) params.set("year", year);
        params.set("page", "1");
        params.set("limit", searchParams.get("limit") || "24");

        router.push(`/tim-kiem-nang-cao?${params.toString()}#results`);
    };

    const handleReset = () => {
        setKeyword("");
        setCategory("");
        setCountry("");
        setType("");
        setYear("");
        router.push("/tim-kiem-nang-cao");
    };

    return (
        <div className="surface-panel mb-10 overflow-hidden">
            <div className="p-4 sm:p-6 md:p-8">
                <form onSubmit={handleSearch} className="space-y-7" role="search">
                    <div className="space-y-2">
                        <label
                            htmlFor="advanced-keyword"
                            className="text-xs font-bold uppercase tracking-[0.14em] text-foreground-muted"
                        >
                            Tên phim hoặc từ khóa
                        </label>
                        <div className="group relative">
                            <Search
                                aria-hidden="true"
                                className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground-muted transition-colors group-focus-within:text-primary"
                            />
                            <input
                                id="advanced-keyword"
                                type="search"
                                value={keyword}
                                onChange={(event) => setKeyword(event.target.value)}
                                placeholder="Nhập tên phim cần tìm..."
                                className="min-h-12 w-full rounded-xl border border-border bg-background py-3 pl-12 pr-4 text-base transition-colors focus:border-primary focus:outline-none sm:text-lg"
                            />
                        </div>
                    </div>

                    <div className="grid gap-7 border-t border-border pt-7">
                        <FilterGroup
                            label="Loại hoặc danh sách phim"
                            options={types}
                            value={type}
                            onChange={setType}
                        />
                        <FilterGroup
                            label="Thể loại"
                            options={genres}
                            value={category}
                            onChange={setCategory}
                            scrollable
                        />
                        <FilterGroup
                            label="Quốc gia"
                            options={countries}
                            value={country}
                            onChange={setCountry}
                            scrollable
                        />

                        <fieldset className="min-w-0 space-y-3">
                            <legend className="text-xs font-bold uppercase tracking-[0.14em] text-foreground-muted">
                                Năm phát hành
                            </legend>
                            <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1 md:max-h-36 md:flex-wrap md:overflow-y-auto md:pr-1">
                                <button
                                    type="button"
                                    onClick={() => setYear("")}
                                    aria-pressed={!year}
                                    className={`min-h-11 flex-none rounded-lg border px-3.5 py-2 text-sm transition-colors ${
                                        !year
                                            ? "border-primary bg-primary text-[var(--primary-text)]"
                                            : "border-border bg-background text-foreground-secondary hover:border-border-strong hover:text-white"
                                    }`}
                                >
                                    Tất cả
                                </button>
                                {years.map((optionYear) => (
                                    <button
                                        key={optionYear}
                                        type="button"
                                        onClick={() =>
                                            setYear(optionYear === year ? "" : optionYear)
                                        }
                                        aria-pressed={optionYear === year}
                                        className={`min-h-11 flex-none rounded-lg border px-3.5 py-2 text-sm transition-colors ${
                                            optionYear === year
                                                ? "border-primary bg-primary text-[var(--primary-text)]"
                                                : "border-border bg-background text-foreground-secondary hover:border-border-strong hover:text-white"
                                        }`}
                                    >
                                        {optionYear}
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
                        <button
                            type="button"
                            onClick={handleReset}
                            disabled={!hasDraftFilters}
                            className="button-secondary min-h-11 px-5 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            <RotateCcw aria-hidden="true" className="h-4 w-4" />
                            Xoá bộ lọc
                        </button>
                        <button
                            type="submit"
                            className="button-primary min-h-11 px-6 sm:min-w-48"
                        >
                            <Search aria-hidden="true" className="h-5 w-5" />
                            Tìm kiếm
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
