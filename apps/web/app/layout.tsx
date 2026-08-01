import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ActiveAccountGuard from "@/components/auth/ActiveAccountGuard";
import "./globals.css";

// Account status must be evaluated for every request. Without this, a build
// performed before Supabase env vars are present could cache protected HTML.
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://toto-tad-cinema.vercel.app";
const SITE_NAME = "ToTo TAD Cinema";
const SITE_DESCRIPTION =
  "Website xem phim riêng tư với phim lẻ, phim bộ và hoạt hình chất lượng cao.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: `${SITE_NAME} – Xem phim trực tuyến`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: ["xem phim", "phim online", "phim miễn phí", "phim hay", "phim bộ", "phim lẻ"],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: SITE_URL,
    title: `${SITE_NAME} – Xem phim trực tuyến`,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
  },
  icons: {
    icon: [
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <head>
        <link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <ActiveAccountGuard>{children}</ActiveAccountGuard>
      </body>
    </html>
  );
}
