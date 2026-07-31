import type { ReactNode } from "react";

interface PageHeaderProps {
    eyebrow?: string;
    title: string;
    description?: string;
    meta?: string;
    actions?: ReactNode;
}

export default function PageHeader({
    eyebrow,
    title,
    description,
    meta,
    actions,
}: PageHeaderProps) {
    return (
        <header className="mb-8 flex flex-col gap-5 border-b border-border pb-7 md:mb-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="page-heading">
                {eyebrow && <p className="page-heading__eyebrow">{eyebrow}</p>}
                <h1 className="page-heading__title">{title}</h1>
                {description && <p className="page-heading__description">{description}</p>}
            </div>
            {(meta || actions) && (
                <div className="flex flex-none items-center gap-3">
                    {meta && (
                        <span className="rounded-full border border-border bg-background-secondary px-3 py-1.5 text-xs font-medium text-foreground-secondary">
                            {meta}
                        </span>
                    )}
                    {actions}
                </div>
            )}
        </header>
    );
}
