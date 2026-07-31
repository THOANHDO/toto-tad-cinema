export default function MovieCardSkeleton() {
    return (
        <div aria-hidden="true">
            <div className="skeleton aspect-[2/3] rounded-[var(--radius-lg)]" />
            <div className="pt-3">
                <div className="skeleton h-4 w-4/5 rounded-md" />
                <div className="skeleton mt-2 h-3 w-2/5 rounded-md" />
            </div>
        </div>
    );
}

export function MovieGridSkeleton({ count = 12 }: { count?: number }) {
    return (
        <div
            className="grid grid-cols-2 gap-x-3 gap-y-7 min-[520px]:grid-cols-3 sm:gap-x-4 md:grid-cols-3 md:gap-x-4 lg:grid-cols-4 xl:grid-cols-6 xl:gap-x-6"
            aria-label="Đang tải danh sách phim"
        >
            {Array.from({ length: count }).map((_, index) => (
                <MovieCardSkeleton key={index} />
            ))}
        </div>
    );
}

export function MovieSliderSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="flex gap-3 overflow-hidden pb-3 sm:gap-4 lg:gap-4 xl:gap-5" aria-label="Đang tải phim">
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className="w-[42vw] max-w-[12.25rem] flex-none min-[520px]:w-[30vw] sm:w-[27vw] md:w-[29vw] md:max-w-none lg:w-[22vw] xl:w-[calc((100%-6.25rem)/6)]"
                >
                    <MovieCardSkeleton />
                </div>
            ))}
        </div>
    );
}

export function HeroSkeleton() {
    return (
        <div className="relative min-h-[34rem] overflow-hidden sm:min-h-[38rem] md:h-[66svh] md:min-h-[36rem] md:max-h-[44rem] lg:h-[68svh] lg:max-h-[48rem] xl:h-[76vh] xl:min-h-[42rem] xl:max-h-[54rem]">
            <div className="skeleton absolute inset-0" />
            <div className="site-container relative flex min-h-[34rem] items-end pb-20 pt-28 sm:min-h-[38rem] md:min-h-[36rem] lg:items-center xl:min-h-[42rem]">
                <div className="w-full max-w-xl">
                    <div className="skeleton mb-5 h-3 w-28 rounded" />
                    <div className="skeleton h-12 w-4/5 rounded-lg sm:h-16" />
                    <div className="skeleton mt-4 h-5 w-1/2 rounded" />
                    <div className="mt-7 flex gap-3">
                        <div className="skeleton h-11 w-32 rounded-xl" />
                        <div className="skeleton h-11 w-32 rounded-xl" />
                    </div>
                </div>
            </div>
        </div>
    );
}
