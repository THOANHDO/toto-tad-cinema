"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface SheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    header?: React.ReactNode;
    children: React.ReactNode;
    side?: "left" | "right";
}

export default function Sheet({
    isOpen,
    onClose,
    title,
    header,
    children,
    side = "right",
}: SheetProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            window.addEventListener("keydown", handleKeyDown);
        }
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    const slideFrom = side === "right" ? "100%" : "-100%";

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[54] bg-black/75 backdrop-blur-sm"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    <motion.div
                        initial={{ x: slideFrom }}
                        animate={{ x: 0 }}
                        exit={{ x: slideFrom }}
                        transition={{ type: "tween", duration: 0.25 }}
                        className={`fixed inset-y-0 z-[55] flex w-[min(22rem,90vw)] flex-col border-border bg-background-secondary shadow-[var(--shadow-lg)] md:w-[min(24rem,70vw)] xl:w-[min(22rem,90vw)] ${
                            side === "right" ? "right-0 border-l" : "left-0 border-r"
                        }`}
                        role="dialog"
                        aria-modal="true"
                        aria-label={title ?? "Menu"}
                    >
                        <div className="flex min-h-16 items-center justify-between border-b border-border px-4 py-3">
                            {header ?? (
                                title ? (
                                    <span className="text-sm font-semibold text-white">{title}</span>
                                ) : (
                                    <span />
                                )
                            )}
                            <button
                                onClick={onClose}
                                className="ml-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-white/5 hover:text-white md:h-11 md:w-11 xl:h-10 xl:w-10"
                                aria-label="Đóng menu"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="hide-scrollbar flex-1 overflow-y-auto">{children}</div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
