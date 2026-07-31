"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Film, Home, Loader2, Plus, Settings2, Trash2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useProfileStore, type Profile } from "@/lib/store/useProfileStore";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { createProfile, deleteProfile } from "./actions";

export default function ProfilesClient({ initialProfiles }: { initialProfiles: Profile[] }) {
    const [profiles, setProfiles] = useState(initialProfiles);
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isManaging, setIsManaging] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<Profile | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    const { setProfile } = useProfileStore();
    const router = useRouter();
    const isSupabaseEnabled = Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const handleSelect = (profile: Profile) => {
        if (isManaging) return;
        setProfile(profile);
        router.push("/");
    };

    const handleCreate = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!newName.trim() || isLoading) return;

        setIsLoading(true);
        setErrorMessage("");
        const result = await createProfile(newName);
        if (result.success && result.data) {
            setProfiles([...profiles, result.data as Profile]);
            setNewName("");
            setIsCreating(false);
        } else if ("error" in result) {
            setErrorMessage(result.error);
        }
        setIsLoading(false);
    };

    const handleDelete = async () => {
        if (!pendingDelete || isLoading) return;

        setIsLoading(true);
        const result = await deleteProfile(pendingDelete.id);
        if (result.success) {
            setProfiles(profiles.filter((profile) => profile.id !== pendingDelete.id));
            setPendingDelete(null);
        } else if ("error" in result) {
            setErrorMessage(result.error);
        }
        setIsLoading(false);
    };

    if (!isSupabaseEnabled) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-4">
                <div className="surface-panel max-w-md p-7 text-center sm:p-9">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Film className="h-7 w-7" />
                    </div>
                    <h1 className="mt-5 text-2xl font-bold tracking-tight text-white">Profile chưa được bật</h1>
                    <p className="mt-3 text-sm leading-6 text-foreground-secondary">
                        ToTo TAD Media vẫn hoạt động bình thường ở chế độ local. Kết nối Supabase để dùng profile gia đình và đồng bộ dữ liệu.
                    </p>
                    <Link href="/" className="button-primary mt-6">
                        <Home className="h-4 w-4" />
                        Về trang chủ
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-14">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,color-mix(in_srgb,var(--primary)_12%,transparent),transparent_34rem)]" />

            <main className="relative w-full max-w-5xl">
                <header className="mb-10 text-center md:mb-14">
                    <p className="eyebrow">ToTo TAD Media</p>
                    <motion.h1
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 text-4xl font-extrabold tracking-[-0.05em] text-white md:text-6xl"
                    >
                        Ai đang xem?
                    </motion.h1>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-foreground-secondary md:text-base">
                        Chọn profile để tiếp tục với danh sách và tiến độ riêng của bạn.
                    </p>
                </header>

                <div className="flex flex-wrap justify-center gap-x-5 gap-y-8 sm:gap-x-8">
                    <AnimatePresence mode="popLayout">
                        {profiles.map((profile, index) => (
                            <motion.article
                                key={profile.id}
                                initial={{ opacity: 0, scale: 0.94 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.94 }}
                                transition={{ delay: index * 0.06 }}
                                className="group relative w-28 text-center sm:w-36 md:w-44 lg:w-48 xl:w-40"
                            >
                                <button
                                    type="button"
                                    onClick={() => handleSelect(profile)}
                                    className="w-full"
                                    aria-label={isManaging ? `Quản lý profile ${profile.full_name}` : `Xem với profile ${profile.full_name}`}
                                >
                                    <span
                                        className={`relative block aspect-square overflow-hidden rounded-[var(--radius-xl)] border bg-background-secondary shadow-[var(--shadow-sm)] transition-[transform,border-color,box-shadow] duration-300 ${
                                            isManaging
                                                ? "border-error/50"
                                                : "border-white/8 group-hover:-translate-y-1 group-hover:border-white/35 group-hover:shadow-[var(--shadow-md)]"
                                        }`}
                                    >
                                        {profile.avatar_url ? (
                                            <img
                                                src={profile.avatar_url}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <span className="flex h-full w-full items-center justify-center">
                                                <User className="h-12 w-12 text-foreground-muted" />
                                            </span>
                                        )}
                                        {isManaging && (
                                            <span className="absolute inset-0 flex items-center justify-center bg-black/58">
                                                <Settings2 className="h-7 w-7 text-white" />
                                            </span>
                                        )}
                                    </span>
                                    <span className="mt-3 block truncate text-sm font-semibold text-foreground-secondary transition-colors group-hover:text-white sm:text-base">
                                        {profile.full_name}
                                    </span>
                                </button>

                                {isManaging && (
                                    <button
                                        type="button"
                                        onClick={() => setPendingDelete(profile)}
                                        className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full border border-error/35 bg-background-secondary text-error shadow-lg transition-colors hover:bg-error hover:text-white md:h-11 md:w-11 xl:h-9 xl:w-9"
                                        aria-label={`Xóa profile ${profile.full_name}`}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </motion.article>
                        ))}

                        {!isCreating ? (
                            <motion.button
                                key="add-profile"
                                type="button"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                onClick={() => {
                                    setIsCreating(true);
                                    setIsManaging(false);
                                    setErrorMessage("");
                                }}
                                className="group w-28 text-center sm:w-36 md:w-44 lg:w-48 xl:w-40"
                            >
                                <span className="flex aspect-square items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-border-strong bg-white/3 text-foreground-muted transition-[transform,border-color,background-color,color] duration-300 group-hover:-translate-y-1 group-hover:border-white/35 group-hover:bg-white/6 group-hover:text-white">
                                    <Plus className="h-11 w-11" />
                                </span>
                                <span className="mt-3 block text-sm font-semibold text-foreground-secondary group-hover:text-white sm:text-base">
                                    Thêm profile
                                </span>
                            </motion.button>
                        ) : (
                            <motion.div
                                key="create-profile"
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full max-w-md"
                            >
                                <form onSubmit={handleCreate} className="surface-panel p-6 sm:p-7">
                                    <p className="eyebrow">Profile mới</p>
                                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">Bạn tên gì?</h2>
                                    <label htmlFor="profile-name" className="sr-only">
                                        Tên profile
                                    </label>
                                    <input
                                        id="profile-name"
                                        autoFocus
                                        type="text"
                                        value={newName}
                                        onChange={(event) => setNewName(event.target.value)}
                                        placeholder="Nhập tên profile"
                                        className="mt-5 w-full rounded-xl border border-border bg-background px-4 py-3.5 text-white transition-colors focus:border-primary focus:outline-none"
                                    />
                                    {errorMessage && <p className="mt-3 text-sm text-error">{errorMessage}</p>}
                                    <div className="mt-5 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCreating(false);
                                                setErrorMessage("");
                                            }}
                                            className="button-ghost flex-1"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            disabled={isLoading || !newName.trim()}
                                            type="submit"
                                            className="button-primary flex-1 disabled:opacity-50"
                                        >
                                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-4 w-4" />}
                                            Tạo profile
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {!isCreating && profiles.length > 0 && (
                    <div className="mt-14 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsManaging(!isManaging);
                                setErrorMessage("");
                            }}
                            className={isManaging ? "button-secondary" : "button-ghost"}
                        >
                            {isManaging ? <Check className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
                            {isManaging ? "Hoàn tất" : "Quản lý profile"}
                        </button>
                    </div>
                )}

                {errorMessage && !isCreating && (
                    <p className="mt-5 text-center text-sm text-error">{errorMessage}</p>
                )}
            </main>

            <ConfirmDialog
                isOpen={Boolean(pendingDelete)}
                title="Xóa profile?"
                description={`Profile ${pendingDelete?.full_name ?? ""} cùng dữ liệu yêu thích và lịch sử liên quan sẽ bị xóa.`}
                confirmLabel="Xóa profile"
                isPending={isLoading}
                onClose={() => setPendingDelete(null)}
                onConfirm={handleDelete}
            />
        </div>
    );
}
