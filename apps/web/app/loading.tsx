export default function Loading() {
    return (
        <div className="page-shell" role="status">
            <div className="mb-10">
                <div className="skeleton h-3 w-24 rounded" />
                <div className="skeleton mt-4 h-12 w-72 max-w-full rounded-xl" />
                <div className="skeleton mt-3 h-4 w-96 max-w-full rounded" />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {Array.from({ length: 12 }).map((_, index) => (
                    <div key={index}>
                        <div className="skeleton aspect-[2/3] rounded-[var(--radius-lg)]" />
                        <div className="skeleton mt-3 h-4 w-4/5 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}
