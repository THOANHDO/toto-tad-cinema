import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ToTo TAD Media – Xem phim trực tuyến",
    template: "%s | ToTo TAD Media",
  },
  description: "Website xem phim miễn phí với chất lượng cao. Phim lẻ, phim bộ, hoạt hình mới nhất.",
  keywords: ["xem phim", "phim online", "phim miễn phí", "phim hay", "phim bộ", "phim lẻ"],
  authors: [{ name: "ToTo TAD Media" }],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "ToTo TAD Media",
  },
  icons: {
    icon: [
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

import ProfileGuard from "@/components/auth/ProfileGuard";

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
        <ProfileGuard>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </ProfileGuard>
      </body>
    </html>
  );
}
