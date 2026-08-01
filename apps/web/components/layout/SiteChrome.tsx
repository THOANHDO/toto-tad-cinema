"use client";

import AccountDataHydrator from "@/components/auth/AccountDataHydrator";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import type { UserAccount } from "@/lib/auth/server";
import { usePathname } from "next/navigation";

const isPublicAuthPath = (pathname: string) =>
  pathname === "/login" || pathname.startsWith("/auth/");

interface SiteChromeProps {
  account: UserAccount | null;
  children: React.ReactNode;
}

export default function SiteChrome({ account, children }: SiteChromeProps) {
  const pathname = usePathname();

  if (isPublicAuthPath(pathname)) {
    return <>{children}</>;
  }

  return (
    <AccountDataHydrator accountId={account?.user_id ?? null}>
      <Header account={account} />
      <main className="flex-1">{children}</main>
      <Footer />
    </AccountDataHydrator>
  );
}
