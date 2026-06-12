"use client";

import Sheet from "@/components/ui/Sheet";
import HelpDialog from "@/components/ui/HelpDialog";
import { getCategories, getCountries } from "@/lib/api/ophim";
import { useProfileStore } from "@/lib/store/useProfileStore";
import { useStore } from "@/lib/store/useStore";
import { AnimatePresence, motion } from "framer-motion";
import {
    Calendar,
    CheckCircle2,
    ChevronDown,
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
    UserCircle,
    Users,
    Volume2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const navItems = [
    { name: "Phim Lẻ", href: "/danh-sach/phim-le", icon: Film },
    { name: "Phim Bộ", href: "/danh-sach/phim-bo", icon: Tv },
    { name: "Hoạt Hình", href: "/danh-sach/hoat-hinh", icon: Gamepad2 },
    { name: "Tìm phim", href: "/tim-kiem-nang-cao", icon: Search },
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

const linkClass =
    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:bg-white/5 hover:text-white";

const sheetLinkClass =
    "flex items-center gap-3 rounded-lg px-4 py-3 text-foreground-secondary transition-colors hover:bg-white/5 hover:text-white";

export default function Header() {
    const router = useRouter();
    const pathname = usePathname();

    const [isScrolled, setIsScrolled] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [genres, setGenres] = useState<any[]>([]);
    const [countries, setCountries] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [sheetSearchQuery, setSheetSearchQuery] = useState("");
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const sheetSearchRef = useRef<HTMLInputElement>(null);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    const isSupabaseEnabled = Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const currentProfile = useProfileStore((state) => state.currentProfile);
    const favoriteSlugs = useProfileStore((state) => state.favoriteSlugs);
    const watchHistory = useProfileStore((state) => state.watchHistory);
    const movieSource = useStore((state) => state.movieSource);
    const setMovieSource = useStore((state) => state.setMovieSource);

    const activeColor = sourceConfig[movieSource].hex;
    const activeHoverColor = sourceConfig[movieSource].hoverHex;

    useEffect(() => {
        setMounted(true);
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
    }, []);

    useEffect(() => {
        if (mounted) {
            document.cookie = `movie-source=${movieSource}; path=/; max-age=31536000; SameSite=Lax`;
        }
    }, [mounted, movieSource]);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
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
        if (searchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [searchOpen]);

    useEffect(() => {
        if (sheetOpen && sheetSearchRef.current && window.innerWidth < 768) {
            sheetSearchRef.current.focus();
        }
    }, [sheetOpen]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
                setProfileMenuOpen(false);
            }
        };
        if (profileMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [profileMenuOpen]);

    const handleSourceChange = (source: MovieSource) => {
        if (source === movieSource) return;
        document.cookie = `movie-source=${source}; path=/; max-age=31536000; SameSite=Lax`;
        setMovieSource(source);
        router.refresh();
    };

    const closeSheet = () => {
        setSheetOpen(false);
        setExpandedSection(null);
        setSheetSearchQuery("");
    };

    const handleSearch = (e: React.FormEvent, query: string, onDone?: () => void) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/tim-kiem?q=${encodeURIComponent(query.trim())}`);
            setSearchOpen(false);
            setSearchQuery("");
            setSheetSearchQuery("");
            onDone?.();
        }
    };

    const toggleSection = (section: string) => {
        setExpandedSection((prev) => (prev === section ? null : section));
    };

    if (pathname === "/profiles") return null;

    const renderSourceOptions = (onSelect?: () => void) =>
        (Object.entries(sourceConfig) as [MovieSource, (typeof sourceConfig)[MovieSource]][]).map(
            ([key, cfg]) => (
                <button
                    key={key}
                    onClick={() => {
                        handleSourceChange(key);
                        onSelect?.();
                    }}
                    className={`flex w-full items-center justify-between rounded-lg py-2.5 pl-3 pr-4 text-sm transition-all border-l-2 ${
                        movieSource === key
                            ? "bg-white/10"
                            : "border-transparent text-foreground-secondary hover:bg-white/5 hover:text-white"
                    }`}
                    style={movieSource === key ? { borderColor: cfg.hex, color: cfg.hex } : {}}
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
                onClick={() => toggleSection(id)}
                className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-foreground-secondary transition-colors hover:bg-white/5 hover:text-white"
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
                                    className="rounded-lg px-3 py-2 text-sm text-foreground-secondary transition-colors hover:bg-white/5 hover:text-white"
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
                className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
                    isScrolled ? "glass shadow-lg" : "bg-gradient-to-b from-black/80 to-transparent"
                }`}
            >
                <div className="container mx-auto px-4">
                    <div className="flex h-16 items-center gap-4 md:h-20">
                        {/* Logo */}
                        <Link href="/" prefetch={false} className="group flex-shrink-0">
                            <motion.div
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                className="flex items-center gap-2.5 md:gap-3"
                            >
                                <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-black/50 transition-colors group-hover:border-primary/50 md:h-11 md:w-11">
                                    <img
                                        src="/logo.png"
                                        alt="Silent Ride"
                                        className="h-full w-full scale-110 object-cover transition-transform duration-500 group-hover:scale-125"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = "none";
                                            const sibling = (e.target as HTMLImageElement)
                                                .nextElementSibling as HTMLElement;
                                            if (sibling) sibling.style.display = "flex";
                                        }}
                                    />
                                    <div
                                        style={{ display: "none" }}
                                        className="absolute inset-0 items-center justify-center bg-gradient-to-br from-primary to-red-700"
                                    >
                                        <Film className="h-5 w-5 text-white md:h-6 md:w-6" />
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="bg-gradient-to-r from-white via-white to-zinc-400 bg-clip-text text-lg font-bold text-transparent md:text-xl lg:text-2xl">
                                        Silent Ride
                                    </span>
                                    <span className="hidden text-[10px] font-medium uppercase leading-none tracking-[0.2em] text-primary md:block md:text-xs">
                                        HQ - Premium Streaming
                                    </span>
                                </div>
                            </motion.div>
                        </Link>

                        {/* Desktop Navigation — center */}
                        <nav className="hidden flex-1 items-center justify-center gap-0.5 lg:flex">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    prefetch={false}
                                    className={linkClass}
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
                                <button className={linkClass}>
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
                                            className="glass absolute left-1/2 top-full z-50 mt-2 w-[480px] -translate-x-1/2 overflow-hidden rounded-xl border border-white/10 p-4 shadow-2xl"
                                        >
                                            <div className="scrollbar-hide grid max-h-[60vh] grid-cols-3 gap-1 overflow-y-auto">
                                                {genres.map((genre) => (
                                                    <Link
                                                        key={genre.slug}
                                                        href={`/the-loai/${genre.slug}`}
                                                        prefetch={false}
                                                        onClick={() => setActiveMenu(null)}
                                                        className="rounded-lg px-3 py-2 text-xs text-foreground-secondary transition-colors hover:bg-white/5 hover:text-primary"
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
                                <button className={linkClass}>
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
                                            className="glass absolute left-1/2 top-full z-50 mt-2 w-[400px] -translate-x-1/2 overflow-hidden rounded-xl border border-white/10 p-4 shadow-2xl"
                                        >
                                            <div className="scrollbar-hide grid max-h-[60vh] grid-cols-2 gap-1 overflow-y-auto">
                                                {countries.map((country) => (
                                                    <Link
                                                        key={country.slug}
                                                        href={`/quoc-gia/${country.slug}`}
                                                        prefetch={false}
                                                        onClick={() => setActiveMenu(null)}
                                                        className="rounded-lg px-3 py-2 text-xs text-foreground-secondary transition-colors hover:bg-white/5 hover:text-primary"
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
                                <button className={linkClass}>
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
                                            className="glass absolute left-1/2 top-full z-50 mt-2 w-64 overflow-hidden overflow-y-auto rounded-xl border border-white/10 shadow-2xl scrollbar-hide"
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
                        <div className="ml-auto flex items-center gap-1 md:gap-1.5">
                            {/* Search — tablet + desktop */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSearchOpen(true)}
                                className="hidden rounded-lg p-2 text-foreground-secondary transition-colors hover:bg-white/5 hover:text-white md:flex"
                                aria-label="Tìm kiếm"
                            >
                                <Search className="h-5 w-5" />
                            </motion.button>

                            {/* Source — desktop only */}
                            <div className="relative group hidden lg:block">
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    className="flex items-center gap-2 rounded-lg border bg-white/5 px-3 py-2 text-xs font-bold transition-all"
                                    style={{ borderColor: `${activeColor}60`, color: activeColor }}
                                >
                                    <Layers className="h-4 w-4" />
                                    <span className="uppercase">{sourceConfig[movieSource].name}</span>
                                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                                </motion.button>
                                <div className="invisible absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 opacity-0 shadow-2xl transition-all glass group-hover:visible group-hover:opacity-100">
                                    <div className="space-y-1 p-2">{renderSourceOptions()}</div>
                                    <div className="border-t border-white/5 bg-white/5 px-4 py-2">
                                        <p className="text-[10px] leading-tight text-foreground-muted">
                                            Chọn nguồn dữ liệu để có nhiều phim hơn.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Profile Dropdown — tablet + desktop */}
                            {isSupabaseEnabled && currentProfile && (
                                <div ref={profileMenuRef} className="relative hidden md:block">
                                    <motion.button
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => setProfileMenuOpen((v) => !v)}
                                        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-2 transition-all hover:bg-white/10 lg:pr-3"
                                        aria-label="Menu profile"
                                        aria-expanded={profileMenuOpen}
                                    >
                                        <div className="h-8 w-8 overflow-hidden rounded-full border border-white/20">
                                            {currentProfile.avatar_url ? (
                                                <img
                                                    src={currentProfile.avatar_url}
                                                    alt={currentProfile.full_name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center bg-gray-800">
                                                    <UserCircle className="h-5 w-5 text-gray-400" />
                                                </div>
                                            )}
                                        </div>
                                        <span className="hidden max-w-[100px] truncate text-sm font-medium text-gray-300 lg:block">
                                            {currentProfile.full_name}
                                        </span>
                                        <ChevronDown
                                            className={`hidden h-4 w-4 text-foreground-muted transition-transform lg:block ${
                                                profileMenuOpen ? "rotate-180" : ""
                                            }`}
                                        />
                                    </motion.button>

                                    <AnimatePresence>
                                        {profileMenuOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 8 }}
                                                className="glass absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 shadow-2xl"
                                            >
                                                <div className="border-b border-white/5 px-4 py-3">
                                                    <p className="truncate text-sm font-semibold text-white">
                                                        {currentProfile.full_name}
                                                    </p>
                                                    <button
                                                        onClick={() => {
                                                            setProfileMenuOpen(false);
                                                            router.push("/profiles");
                                                        }}
                                                        className="mt-0.5 text-xs text-primary hover:underline"
                                                    >
                                                        Đổi profile
                                                    </button>
                                                </div>
                                                <div className="p-1.5">
                                                    <Link
                                                        href="/yeu-thich"
                                                        prefetch={false}
                                                        onClick={() => setProfileMenuOpen(false)}
                                                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground-secondary transition-colors hover:bg-white/5 hover:text-white"
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
                                                        onClick={() => setProfileMenuOpen(false)}
                                                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground-secondary transition-colors hover:bg-white/5 hover:text-white"
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
                                                            setProfileMenuOpen(false);
                                                            setHelpOpen(true);
                                                        }}
                                                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground-secondary transition-colors hover:bg-white/5 hover:text-white"
                                                    >
                                                        <HelpCircle className="h-4 w-4" />
                                                        Hướng dẫn
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Hamburger — mobile + tablet */}
                            <button
                                onClick={() => setSheetOpen(true)}
                                className="rounded-lg p-2 text-foreground-secondary transition-colors hover:bg-white/5 hover:text-white lg:hidden"
                                aria-label="Mở menu"
                            >
                                <Menu className="h-6 w-6" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Search Overlay — tablet + desktop shortcut */}
            <AnimatePresence>
                {searchOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm"
                        onClick={() => setSearchOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: -40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -40 }}
                            className="container mx-auto px-4 pt-24"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <form
                                onSubmit={(e) => handleSearch(e, searchQuery)}
                                className="mx-auto max-w-2xl"
                            >
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-foreground-muted" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Tìm kiếm phim, diễn viên, thể loại..."
                                        className="w-full rounded-2xl border border-border bg-background-secondary py-4 pl-14 pr-12 text-lg transition-colors focus:border-primary focus:outline-none"
                                    />
                                </div>
                                <p className="mt-4 text-center text-sm text-foreground-muted">
                                    Nhấn Enter để tìm kiếm.{" "}
                                    <Link
                                        href="/tim-kiem-nang-cao"
                                        onClick={() => setSearchOpen(false)}
                                        className="text-primary hover:underline"
                                    >
                                        Tìm kiếm nâng cao
                                    </Link>
                                </p>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                            className="flex items-center gap-2"
                        >
                            <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-black/50">
                                <img src="/logo.png" alt="" className="h-full w-full object-cover" />
                            </div>
                            <span className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-base font-bold text-transparent">
                                Silent Ride
                            </span>
                        </Link>
                    </div>
                }
            >
                <div className="flex flex-col pb-8">
                    {/* Inline Search — mobile only */}
                    <form
                        onSubmit={(e) => handleSearch(e, sheetSearchQuery, closeSheet)}
                        className="border-b border-white/5 p-4 md:hidden"
                    >
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
                            <input
                                ref={sheetSearchRef}
                                type="text"
                                value={sheetSearchQuery}
                                onChange={(e) => setSheetSearchQuery(e.target.value)}
                                placeholder="Tìm kiếm phim..."
                                className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm transition-colors focus:border-primary focus:outline-none"
                            />
                        </div>
                    </form>

                    {/* Profile — mobile only (tablet has it in header) */}
                    {isSupabaseEnabled && currentProfile && (
                        <button
                            onClick={() => {
                                closeSheet();
                                router.push("/profiles");
                            }}
                            className="flex items-center gap-3 border-b border-white/5 p-4 transition-colors hover:bg-white/5 md:hidden"
                        >
                            <div className="h-10 w-10 overflow-hidden rounded-full border border-white/20">
                                {currentProfile.avatar_url ? (
                                    <img
                                        src={currentProfile.avatar_url}
                                        alt={currentProfile.full_name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-gray-800">
                                        <UserCircle className="h-5 w-5 text-gray-400" />
                                    </div>
                                )}
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-semibold text-white">
                                    {currentProfile.full_name}
                                </p>
                                <p className="text-xs text-foreground-muted">Đổi profile</p>
                            </div>
                        </button>
                    )}

                    {/* Source — mobile + tablet (hidden on desktop) */}
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
                            onClick={() => toggleSection("explore")}
                            className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-foreground-secondary transition-colors hover:bg-white/5 hover:text-white"
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

                    {/* Favorites / History / Help — mobile only (tablet uses profile dropdown) */}
                    {isSupabaseEnabled && (
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
                        </div>
                    )}
                </div>
            </Sheet>

            <HelpDialog isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
        </>
    );
}
