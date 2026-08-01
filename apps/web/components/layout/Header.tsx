"use client";

import Sheet from "@/components/ui/Sheet";
import HelpDialog from "@/components/ui/HelpDialog";
import SignOutButton from "@/components/auth/SignOutButton";
import { getCategories, getCountries } from "@/lib/api/ophim";
import type { UserAccount } from "@/lib/auth/server";
import { useAccountDataStore } from "@/lib/store/useAccountDataStore";
import { useStore } from "@/lib/store/useStore";
import { AnimatePresence, motion } from "framer-motion";
import {
    Calendar,
    CheckCircle2,
    ChevronDown,
    Clapperboard,
    Film,
    Gamepad2,
    Heart,
    HelpCircle,
    History,
    Languages,
    Layers,
    Menu,
    Mic2,
    PlayCircle,
    Search,
    Ticket,
    Tv,
    Users,
    Volume2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const navItems = [
    { name: "Phim Lẻ", href: "/danh-sach/phim-le", icon: Film },
    { name: "Phim Bộ", href: "/danh-sach/phim-bo", icon: Tv },
    { name: "Hoạt Hình", href: "/danh-sach/hoat-hinh", icon: Gamepad2 },
];

const exploreItems = [
    { name: "Phim Vietsub", href: "/danh-sach/phim-vietsub", icon: Languages },
    { name: "Thuyết Minh", href: "/danh-sach/phim-thuyet-minh", icon: Mic2 },
    { name: "Lồng Tiếng", href: "/danh-sach/phim-long-tieng", icon: Volume2 },
    { name: "Bộ Đang Chiếu", href: "/danh-sach/phim-bo-dang-chieu", icon: PlayCircle },
    { name: "Bộ Hoàn Thành", href: "/danh-sach/phim-bo-hoan-thanh", icon: CheckCircle2 },
    { name: "Sắp Chiếu", href: "/danh-sach/phim-sap-chieu", icon: Calendar },
    { name: "Chiếu Rạp", href: "/danh-sach/phim-chieu-rap", icon: Ticket },
    { name: "Subteam", href: "/danh-sach/subteam", icon: Users },
];

const sourceConfig = {
    ophim: { hex: "#E50914", hoverHex: "#b20710", name: "OPhim" },
    nguonc: { hex: "#0063E5", hoverHex: "#004db3", name: "NguonPhim" },
    kkphim: { hex: "#F5C518", hoverHex: "#d4a800", name: "KKPhim" },
} as const;

type MovieSource = keyof typeof sourceConfig;

interface HeaderFilterOption {
    name: string;
    slug: string;
}

const persistMovieSource = (source: MovieSource) => {
    document.cookie = `movie-source=${source}; path=/; max-age=31536000; SameSite=Lax`;
};

const linkClass =
    "flex min-h-10 items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:bg-white/6 hover:text-white";

const sheetLinkClass =
    "flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground-secondary transition-colors hover:bg-white/6 hover:text-white";

function BrandLockup({ priority = false }: { priority?: boolean }) {
    return (
        <span className="flex min-w-0 items-center gap-2">
            <span className="relative h-10 w-10 flex-none overflow-hidden rounded-full bg-[#101114] md:h-11 md:w-11 xl:h-12 xl:w-12">
                <Image
                    src="/brand/toto-tad-face.png"
                    alt=""
                    fill
                    priority={priority}
                    sizes="(min-width: 1280px) 48px, (min-width: 768px) 44px, 40px"
                    aria-hidden="true"
                    className="object-cover"
                />
            </span>
            <span className="flex min-w-0 flex-col justify-center leading-none max-[359px]:hidden">
                <span className="whitespace-nowrap text-[15px] font-black tracking-[-0.035em] md:text-[17px]">
                    <span className="text-[#e73343]">ToTo</span>{" "}
                    <span className="text-[#fff3e6]">TAD</span>
                </span>
                <span className="mt-1 flex items-center gap-1 text-[8px] font-bold tracking-[0.3em] text-[#d7d0c7] md:text-[9px]">
                    CINEMA
                    <Clapperboard
                        aria-hidden="true"
                        className="h-2.5 w-2.5 flex-none text-[#e73343] md:h-3 md:w-3"
                        strokeWidth={2.4}
                    />
                </span>
            </span>
        </span>
    );
}

export default function Header({ account }: { account: UserAccount | null }) {
    const router = useRouter();
    const pathname = usePathname();

    const [isScrolled, setIsScrolled] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [genres, setGenres] = useState<HeaderFilterOption[]>([]);
    const [countries, setCountries] = useState<HeaderFilterOption[]>([]);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    const accountMenuRef = useRef<HTMLDivElement>(null);
    const favoriteSlugs = useAccountDataStore((state) => state.favoriteSlugs);
    const watchHistory = useAccountDataStore((state) => state.watchHistory);
    const movieSource = useStore((state) => state.movieSource);
    const setMovieSource = useStore((state) => state.setMovieSource);

    const activeColor = sourceConfig[movieSource].hex;
    const activeHoverColor = sourceConfig[movieSource].hoverHex;
    const accountName = account?.display_name?.trim() || account?.email || "Tài khoản";
    const accountInitial = accountName.charAt(0).toLocaleUpperCase("vi-VN");

    useEffect(() => {
        const frameId = window.requestAnimationFrame(() => setMounted(true));
        const fetchData = async () => {
            try {
                const [gData, cData] = await Promise.all([getCategories(), getCountries()]);
                setGenres(gData?.data?.items || []);
                setCountries(cData?.data?.items || []);
            } catch (error) {
                console.error("Failed to fetch header data:", error);
            }
        };
        fetchData();

        return () => window.cancelAnimationFrame(frameId);
    }, []);

    useEffect(() => {
        if (mounted) {
            persistMovieSource(movieSource);
        }
    }, [mounted, movieSource]);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        const frameId = window.requestAnimationFrame(handleScroll);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            window.cancelAnimationFrame(frameId);
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    useEffect(() => {
        const hasVisited = localStorage.getItem("silent-ride-visited");
        if (!hasVisited) {
            const timer = setTimeout(() => {
                setHelpOpen(true);
                localStorage.setItem("silent-ride-visited", "true");
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
                setAccountMenuOpen(false);
            }
        };
        if (accountMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [accountMenuOpen]);

    const handleSourceChange = (source: MovieSource) => {
        if (source === movieSource) return;
        persistMovieSource(source);
        setMovieSource(source);
        router.refresh();
    };

    const closeSheet = () => {
        setSheetOpen(false);
        setExpandedSection(null);
    };

    const toggleSection = (section: string) => {
        setExpandedSection((prev) => (prev === section ? null : section));
    };

    const renderSourceOptions = (onSelect?: () => void) =>
        (Object.entries(sourceConfig) as [MovieSource, (typeof sourceConfig)[MovieSource]][]).map(
            ([key, cfg]) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => {
                        handleSourceChange(key);
                        onSelect?.();
                    }}
                    className={`flex min-h-11 w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors ${
                        movieSource === key
                            ? "bg-white/8"
                            : "border-transparent text-foreground-secondary hover:bg-white/5 hover:text-white"
                    }`}
                    style={movieSource === key ? { borderColor: `${cfg.hex}80`, color: cfg.hex } : {}}
                    aria-pressed={movieSource === key}
                >
                    <span className="flex items-center gap-2">
                        <span
                            className="h-2 w-2 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: cfg.hex }}
                        />
                        {cfg.name}
                    </span>
                    {movieSource === key && <CheckCircle2 className="h-4 w-4" />}
                </button>
            )
        );

    const renderNavLinks = (onNavigate?: () => void) =>
        navItems.map((item) => (
            <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={onNavigate}
                className={sheetLinkClass}
            >
                <item.icon className="h-5 w-5" />
                {item.name}
            </Link>
        ));

    const renderAccordion = (
        id: string,
        label: string,
        items: { slug: string; name: string }[],
        hrefPrefix: string,
        onNavigate?: () => void
    ) => (
        <div className="px-2">
            <button
                type="button"
                onClick={() => toggleSection(id)}
                className="flex min-h-12 w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-foreground-secondary transition-colors hover:bg-white/5 hover:text-white"
                aria-expanded={expandedSection === id}
            >
                {label}
                <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                        expandedSection === id ? "rotate-180" : ""
                    }`}
                />
            </button>
            <AnimatePresence>
                {expandedSection === id && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-2 gap-1 px-2 pb-2">
                            {items.map((item) => (
                                <Link
                                    key={item.slug}
                                    href={`${hrefPrefix}/${item.slug}`}
                                    prefetch={false}
                                    onClick={onNavigate}
                                    className="rounded-lg px-3 py-2.5 text-sm text-foreground-secondary transition-colors hover:bg-white/5 hover:text-white md:flex md:min-h-11 md:items-center"
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    return (
        <>
            <style>{`:root { --primary: ${activeColor}; --primary-hover: ${activeHoverColor}; --primary-text: ${movieSource === "kkphim" ? "#000000" : "#ffffff"}; }`}</style>

            <header
                className="fixed left-0 right-0 top-0 z-50 bg-transparent"
            >
                <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-x-0 top-0 h-[calc(100%+2rem)] bg-gradient-to-b from-black/80 via-black/35 to-transparent transition-opacity duration-300 ease-out ${
                        isScrolled ? "opacity-0" : "opacity-100"
                    }`}
                />
                <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-0 bg-black/[0.94] transition-[opacity,backdrop-filter] duration-300 ease-out ${
                        isScrolled ? "opacity-100 backdrop-blur-md" : "opacity-0 backdrop-blur-none"
                    }`}
                />

                <div className="site-container relative">
                    <div className="flex h-16 min-w-0 items-center gap-3 md:h-[4.5rem]">
                        {/* Logo */}
                        <Link
                            href="/"
                            prefetch={false}
                            className="group flex h-11 flex-shrink-0 items-center"
                            aria-label="ToTo TAD Cinema"
                        >
                            <motion.div
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex items-center"
                            >
                                <BrandLockup priority />
                            </motion.div>
                        </Link>

                        {/* Desktop Navigation — center */}
                        <nav className="hidden flex-1 items-center justify-center gap-0.5 xl:flex" aria-label="Điều hướng chính">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    prefetch={false}
                                    className={`${linkClass} ${
                                        pathname === item.href || pathname.startsWith(`${item.href}/`)
                                            ? "bg-white/8 text-white"
                                            : ""
                                    }`}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.name}
                                </Link>
                            ))}

                            {/* Thể loại */}
                            <div
                                className="relative"
                                onMouseEnter={() => setActiveMenu("genres")}
                                onMouseLeave={() => setActiveMenu(null)}
                            >
                                <button
                                    type="button"
                                    className={linkClass}
                                    aria-expanded={activeMenu === "genres"}
                                    onFocus={() => setActiveMenu("genres")}
                                >
                                    Thể loại
                                    <ChevronDown
                                        className={`h-4 w-4 transition-transform duration-200 ${
                                            activeMenu === "genres" ? "rotate-180" : ""
                                        }`}
                                    />
                                </button>
                                <AnimatePresence>
                                    {activeMenu === "genres" && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 8 }}
                                            className="glass absolute left-1/2 top-full z-50 mt-2 w-[30rem] -translate-x-1/2 overflow-hidden rounded-2xl p-3"
                                        >
                                            <div className="scrollbar-hide grid max-h-[60vh] grid-cols-3 gap-1 overflow-y-auto">
                                                {genres.map((genre) => (
                                                    <Link
                                                        key={genre.slug}
                                                        href={`/the-loai/${genre.slug}`}
                                                        prefetch={false}
                                                        onClick={() => setActiveMenu(null)}
                                                        className="rounded-lg px-3 py-2.5 text-xs text-foreground-secondary transition-colors hover:bg-white/5 hover:text-primary"
                                                    >
                                                        {genre.name}
                                                    </Link>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Quốc gia */}
                            <div
                                className="relative"
                                onMouseEnter={() => setActiveMenu("countries")}
                                onMouseLeave={() => setActiveMenu(null)}
                            >
                                <button
                                    type="button"
                                    className={linkClass}
                                    aria-expanded={activeMenu === "countries"}
                                    onFocus={() => setActiveMenu("countries")}
                                >
                                    Quốc gia
                                    <ChevronDown
                                        className={`h-4 w-4 transition-transform duration-200 ${
                                            activeMenu === "countries" ? "rotate-180" : ""
                                        }`}
                                    />
                                </button>
                                <AnimatePresence>
                                    {activeMenu === "countries" && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 8 }}
                                            className="glass absolute left-1/2 top-full z-50 mt-2 w-[25rem] -translate-x-1/2 overflow-hidden rounded-2xl p-3"
                                        >
                                            <div className="scrollbar-hide grid max-h-[60vh] grid-cols-2 gap-1 overflow-y-auto">
                                                {countries.map((country) => (
                                                    <Link
                                                        key={country.slug}
                                                        href={`/quoc-gia/${country.slug}`}
                                                        prefetch={false}
                                                        onClick={() => setActiveMenu(null)}
                                                        className="rounded-lg px-3 py-2.5 text-xs text-foreground-secondary transition-colors hover:bg-white/5 hover:text-primary"
                                                    >
                                                        {country.name}
                                                    </Link>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Danh sách */}
                            <div
                                className="relative"
                                onMouseEnter={() => setActiveMenu("explore")}
                                onMouseLeave={() => setActiveMenu(null)}
                            >
                                <button
                                    type="button"
                                    className={linkClass}
                                    aria-expanded={activeMenu === "explore"}
                                    onFocus={() => setActiveMenu("explore")}
                                >
                                    Danh sách
                                    <ChevronDown
                                        className={`h-4 w-4 transition-transform duration-200 ${
                                            activeMenu === "explore" ? "rotate-180" : ""
                                        }`}
                                    />
                                </button>
                                <AnimatePresence>
                                    {activeMenu === "explore" && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 8 }}
                                            className="glass absolute left-1/2 top-full z-50 mt-2 w-64 overflow-hidden overflow-y-auto rounded-2xl scrollbar-hide"
                                        >
                                            <div className="grid grid-cols-1 gap-1 p-2">
                                                {exploreItems.map((item) => (
                                                    <Link
                                                        key={item.href}
                                                        href={item.href}
                                                        prefetch={false}
                                                        onClick={() => setActiveMenu(null)}
                                                        className="group/item flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-foreground-secondary transition-colors hover:bg-white/5 hover:text-white"
                                                    >
                                                        <item.icon className="h-4 w-4 text-foreground-muted transition-colors group-hover/item:text-primary" />
                                                        {item.name}
                                                    </Link>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </nav>

                        {/* Right Actions */}
                        <div className="ml-auto flex items-center gap-1.5">
                            {/* Search — tablet + desktop */}
                            <Link
                                href="/tim-kiem-nang-cao"
                                prefetch={false}
                                className="hidden min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-foreground-secondary transition-colors hover:bg-white/7 hover:text-white md:flex md:min-h-11 md:px-3.5 xl:min-h-10 xl:px-3"
                                aria-label="Tìm kiếm"
                            >
                                <Search className="h-5 w-5" />
                                <span className="hidden xl:inline">Tìm kiếm</span>
                            </Link>

                            {/* Source — large tablet + desktop */}
                            <div className="relative group hidden lg:block">
                                <motion.button
                                    whileHover={{ y: -1 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="button"
                                    className="flex min-h-10 items-center gap-2 rounded-full border bg-white/5 px-3 text-xs font-bold transition-colors lg:min-h-11 xl:min-h-10"
                                    style={{ borderColor: `${activeColor}60`, color: activeColor }}
                                    aria-label={`Nguồn phim hiện tại: ${sourceConfig[movieSource].name}`}
                                >
                                    <Layers className="h-4 w-4" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                                        Nguồn
                                    </span>
                                    <span>{sourceConfig[movieSource].name}</span>
                                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                                </motion.button>
                                <div className="invisible absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl opacity-0 transition-all glass group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                                    <div className="space-y-1 p-2">{renderSourceOptions()}</div>
                                    <div className="border-t border-white/5 bg-white/5 px-4 py-2">
                                        <p className="text-[10px] leading-tight text-foreground-muted">
                                            Chọn nguồn dữ liệu để có nhiều phim hơn.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Account dropdown — tablet + desktop */}
                            {account && (
                                <div ref={accountMenuRef} className="relative hidden md:block">
                                    <motion.button
                                        whileHover={{ y: -1 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="button"
                                        onClick={() => setAccountMenuOpen((open) => !open)}
                                        className="flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-2 transition-colors hover:border-white/20 hover:bg-white/10 md:min-h-11 lg:pr-3 xl:min-h-10"
                                        aria-label={`Menu tài khoản của ${accountName}`}
                                        aria-expanded={accountMenuOpen}
                                    >
                                        <div
                                            data-account-avatar="desktop"
                                            className="m-0 grid size-8 aspect-square shrink-0 place-items-center overflow-hidden rounded-full p-0 text-center text-sm font-bold leading-none text-primary"
                                        >
                                            <div
                                                data-account-avatar-circle="desktop"
                                                className="m-0 grid size-full aspect-square shrink-0 place-items-center overflow-hidden rounded-full border border-white/20 bg-primary/20 p-0 leading-none [transform:none]"
                                            >
                                                <span
                                                    data-account-avatar-initial="desktop"
                                                    aria-hidden="true"
                                                    className="m-0 block size-[1em] p-0 text-center leading-none [transform:none]"
                                                >
                                                    {accountInitial}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="hidden max-w-[100px] truncate text-sm font-medium text-gray-300 lg:block">
                                            {accountName}
                                        </span>
                                        <ChevronDown
                                            className={`hidden h-4 w-4 text-foreground-muted transition-transform lg:block ${
                                                accountMenuOpen ? "rotate-180" : ""
                                            }`}
                                        />
                                    </motion.button>

                                    <AnimatePresence>
                                        {accountMenuOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 8 }}
                                                className="glass absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl"
                                            >
                                                <div className="border-b border-white/5 px-4 py-3">
                                                    <p className="truncate text-sm font-semibold text-white">
                                                        {accountName}
                                                    </p>
                                                    <p className="mt-0.5 truncate text-xs text-foreground-muted">
                                                        {account.email}
                                                    </p>
                                                </div>
                                                <div className="p-1.5">
                                                    <Link
                                                        href="/yeu-thich"
                                                        prefetch={false}
                                                        onClick={() => setAccountMenuOpen(false)}
                                                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground-secondary transition-colors hover:bg-white/5 hover:text-white md:min-h-11 xl:min-h-0"
                                                    >
                                                        <Heart className="h-4 w-4" />
                                                        Yêu thích
                                                        {mounted && favoriteSlugs.length > 0 && (
                                                            <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-[var(--primary-text)]">
                                                                {favoriteSlugs.length}
                                                            </span>
                                                        )}
                                                    </Link>
                                                    <Link
                                                        href="/lich-su"
                                                        prefetch={false}
                                                        onClick={() => setAccountMenuOpen(false)}
                                                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground-secondary transition-colors hover:bg-white/5 hover:text-white md:min-h-11 xl:min-h-0"
                                                    >
                                                        <History className="h-4 w-4" />
                                                        Lịch sử xem
                                                        {mounted && watchHistory.length > 0 && (
                                                            <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-xs text-white">
                                                                {watchHistory.length}
                                                            </span>
                                                        )}
                                                    </Link>
                                                    <button
                                                        onClick={() => {
                                                            setAccountMenuOpen(false);
                                                            setHelpOpen(true);
                                                        }}
                                                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground-secondary transition-colors hover:bg-white/5 hover:text-white md:min-h-11 xl:min-h-0"
                                                    >
                                                        <HelpCircle className="h-4 w-4" />
                                                        Hướng dẫn
                                                    </button>
                                                    <SignOutButton
                                                        onBeforeSignOut={() => setAccountMenuOpen(false)}
                                                        className="mt-1 flex w-full items-center gap-3 border-t border-white/5 px-3 py-3 text-sm text-error transition-colors hover:bg-error/10 hover:text-[#ff8d8d] md:min-h-11 xl:min-h-0"
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Hamburger — mobile + tablet */}
                            <button
                                type="button"
                                onClick={() => setSheetOpen(true)}
                                className="flex h-10 w-10 items-center justify-center rounded-full text-foreground-secondary transition-colors hover:bg-white/7 hover:text-white md:h-11 md:w-11 xl:hidden"
                                aria-label="Mở menu"
                            >
                                <Menu className="h-6 w-6" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile + Tablet Sheet */}
            <Sheet
                isOpen={sheetOpen}
                onClose={closeSheet}
                header={
                    <div className="flex w-full items-center justify-between">
                        <Link
                            href="/"
                            prefetch={false}
                            onClick={closeSheet}
                            className="flex min-h-11 items-center"
                            aria-label="ToTo TAD Cinema"
                        >
                            <BrandLockup />
                        </Link>
                    </div>
                }
            >
                <div className="flex flex-col pb-8">
                    {/* Search — mobile only (tablet has it in header) */}
                    <div className="border-b border-white/5 p-2 md:hidden">
                        <Link
                            href="/tim-kiem-nang-cao"
                            prefetch={false}
                            onClick={closeSheet}
                            className={sheetLinkClass}
                        >
                            <Search className="h-5 w-5" />
                            Tìm kiếm
                        </Link>
                    </div>

                    {/* Auth account — mobile only (tablet has it in header) */}
                    {account && (
                        <div className="flex min-h-16 items-center gap-3 border-b border-white/5 p-4 md:hidden">
                            <div
                                data-account-avatar="mobile"
                                className="m-0 grid size-10 aspect-square shrink-0 place-items-center overflow-hidden rounded-full p-0 text-center text-base font-bold leading-none text-primary"
                            >
                                <div
                                    data-account-avatar-circle="mobile"
                                    className="m-0 grid size-full aspect-square shrink-0 place-items-center overflow-hidden rounded-full border border-white/20 bg-primary/20 p-0 leading-none [transform:none]"
                                >
                                    <span
                                        data-account-avatar-initial="mobile"
                                        aria-hidden="true"
                                        className="m-0 block size-[1em] p-0 text-center leading-none [transform:none]"
                                    >
                                        {accountInitial}
                                    </span>
                                </div>
                            </div>
                            <div className="min-w-0 text-left">
                                <p className="truncate text-sm font-semibold text-white">{accountName}</p>
                                <p className="truncate text-xs text-foreground-muted">{account.email}</p>
                            </div>
                        </div>
                    )}

                    {/* Source — mobile + tablet portrait */}
                    <div className="border-b border-white/5 p-4 lg:hidden">
                        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                            Nguồn phim
                        </p>
                        <div className="space-y-1">{renderSourceOptions(closeSheet)}</div>
                    </div>

                    {/* Nav links */}
                    <nav className="space-y-0.5 px-2 pt-3">
                        {renderNavLinks(closeSheet)}
                    </nav>

                    {/* Accordions */}
                    <div className="mt-2 space-y-1">
                        {renderAccordion("genres", "Thể loại", genres, "/the-loai", closeSheet)}
                        {renderAccordion("countries", "Quốc gia", countries, "/quoc-gia", closeSheet)}
                    </div>

                    <div className="mt-1 px-2">
                        <button
                            type="button"
                            onClick={() => toggleSection("explore")}
                            className="flex min-h-12 w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-foreground-secondary transition-colors hover:bg-white/5 hover:text-white"
                            aria-expanded={expandedSection === "explore"}
                        >
                            Danh sách
                            <ChevronDown
                                className={`h-4 w-4 transition-transform duration-200 ${
                                    expandedSection === "explore" ? "rotate-180" : ""
                                }`}
                            />
                        </button>
                        <AnimatePresence>
                            {expandedSection === "explore" && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="space-y-0.5 pb-2">
                                        {exploreItems.map((item) => (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                prefetch={false}
                                                onClick={closeSheet}
                                                className={sheetLinkClass}
                                            >
                                                <item.icon className="h-5 w-5" />
                                                {item.name}
                                            </Link>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Favorites / History / Help — mobile only (tablet uses account dropdown) */}
                    {account && (
                        <div className="mt-4 space-y-0.5 border-t border-white/5 px-2 pt-4 md:hidden">
                            <Link
                                href="/yeu-thich"
                                prefetch={false}
                                onClick={closeSheet}
                                className={sheetLinkClass}
                            >
                                <Heart className="h-5 w-5" />
                                Yêu thích
                                {mounted && favoriteSlugs.length > 0 && (
                                    <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-[var(--primary-text)]">
                                        {favoriteSlugs.length}
                                    </span>
                                )}
                            </Link>
                            <Link
                                href="/lich-su"
                                prefetch={false}
                                onClick={closeSheet}
                                className={sheetLinkClass}
                            >
                                <History className="h-5 w-5" />
                                Lịch sử xem
                                {mounted && watchHistory.length > 0 && (
                                    <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-xs text-white">
                                        {watchHistory.length}
                                    </span>
                                )}
                            </Link>
                            <button
                                onClick={() => {
                                    closeSheet();
                                    setHelpOpen(true);
                                }}
                                className={`${sheetLinkClass} w-full`}
                            >
                                <HelpCircle className="h-5 w-5" />
                                Hướng dẫn
                            </button>
                            <SignOutButton
                                onBeforeSignOut={closeSheet}
                                className={`${sheetLinkClass} w-full text-error hover:bg-error/10 hover:text-[#ff8d8d]`}
                            />
                        </div>
                    )}
                </div>
            </Sheet>

            <HelpDialog isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
        </>
    );
}
