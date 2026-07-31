import type { ReactNode } from "react";

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="empty-state">
            {icon && <div className="empty-state__icon">{icon}</div>}
            <div>
                <p className="empty-state__title">{title}</p>
                {description && <p className="empty-state__description mt-2">{description}</p>}
            </div>
            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}
