import { validateAuthenticatedAccount } from "@/lib/auth/server";
import SiteChrome from "@/components/layout/SiteChrome";

export default async function ActiveAccountGuard({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const context = await validateAuthenticatedAccount();
  return <SiteChrome account={context?.account ?? null}>{children}</SiteChrome>;
}
