"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    isPending?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

export default function ConfirmDialog({
    isOpen,
    title,
    description,
    confirmLabel,
    isPending = false,
    onConfirm,
    onClose,
}: ConfirmDialogProps) {
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !isPending) onClose();
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, isPending, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
                    onClick={() => !isPending && onClose()}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 12 }}
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="confirm-dialog-title"
                        aria-describedby="confirm-dialog-description"
                        className="surface-panel relative w-full max-w-sm p-6 shadow-[var(--shadow-lg)] md:max-w-md md:p-7 xl:max-w-sm xl:p-6"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isPending}
                            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-white/5 hover:text-white md:h-11 md:w-11 xl:h-9 xl:w-9"
                            aria-label="Đóng hộp thoại"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-error/25 bg-error/10 text-error">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <h2 id="confirm-dialog-title" className="mt-5 text-xl font-bold tracking-tight text-white">
                            {title}
                        </h2>
                        <p id="confirm-dialog-description" className="mt-2 text-sm leading-6 text-foreground-secondary">
                            {description}
                        </p>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                disabled={isPending}
                                onClick={onClose}
                                className="button-ghost flex-1"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                disabled={isPending}
                                onClick={onConfirm}
                                className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-md)] bg-error px-4 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-55"
                            >
                                {isPending ? "Đang xử lý…" : confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
