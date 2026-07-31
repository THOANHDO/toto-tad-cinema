"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard, Tablet, Zap, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from "lucide-react";
import { useEffect, useState } from "react";

interface HelpDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function HelpDialog({ isOpen, onClose }: HelpDialogProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const sections = [
        {
            title: "Phím tắt bàn phím",
            icon: Keyboard,
            items: [
                { key: <ArrowLeft className="w-3 h-3" />, label: "Lùi 10 giây" },
                { key: <ArrowRight className="w-3 h-3" />, label: "Tiến 10 giây" },
                { key: <ArrowUp className="w-3 h-3" />, label: "Tập tiếp theo" },
                { key: <ArrowDown className="w-3 h-3" />, label: "Tập trước đó" },
            ]
        },
        {
            title: "Thao tác trên Mobile",
            icon: Tablet,
            items: [
                { key: "2x Tap", label: "Chạm 2 lần trái/phải để tua 10s" },
                { key: "Swipe", label: "Vuốt ngang để xem phim khác" },
            ]
        },
        {
            title: "Tính năng chung",
            icon: Zap,
            items: [
                { key: "Autoplay", label: "Tự động phát khi chuyển tập" },
                { key: "Resume", label: "Xem tiếp đoạn đang xem dở" },
                { key: "History", label: "Lưu lịch sử xem tự động" },
            ]
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/82 backdrop-blur-md"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="help-dialog-title"
                        className="surface-panel relative w-full max-w-lg overflow-hidden shadow-[var(--shadow-lg)]"
                    >
                        {/* Header */}
                        <div className="relative border-b border-border bg-gradient-to-r from-primary/10 to-transparent p-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                    <Zap className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h2 id="help-dialog-title" className="text-xl font-bold text-white">Hướng dẫn sử dụng</h2>
                                    <p className="text-xs text-foreground-muted">Tối ưu trải nghiệm xem phim của bạn</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-white/5 hover:text-white"
                                aria-label="Đóng hướng dẫn"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="hide-scrollbar max-h-[70vh] space-y-7 overflow-y-auto p-6">
                            {sections.map((section, idx) => (
                                <div key={idx} className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider">
                                        <section.icon className="w-4 h-4" />
                                        {section.title}
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {section.items.map((item, i) => (
                                            <div key={i} className="flex items-center justify-between rounded-xl border border-border bg-background p-3 transition-colors hover:border-border-strong">
                                                <span className="text-sm text-foreground-secondary">{item.label}</span>
                                                <div className="flex min-w-8 items-center justify-center rounded border border-border-strong bg-background-tertiary px-2 py-1 font-mono text-[10px] text-white">
                                                    {item.key}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-border bg-black/20 p-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="button-primary w-full"
                            >
                                Đã hiểu, bắt đầu xem phim!
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
