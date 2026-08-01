import { createServerSupabaseClient } from "@repo/database/server";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getSafeNextPath } from "./redirect";

export type AccountRole = "admin" | "member";

export interface UserAccount {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: AccountRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActiveAccountContext {
  user: User;
  account: UserAccount;
}

interface AuthAccountState {
  user: User | null;
  account: UserAccount | null;
}

const ACCOUNT_COLUMNS =
  "user_id,email,display_name,role,is_active,created_at,updated_at";

/** Reads and memoizes the authenticated user/account pair for this request. */
const readAuthAccountState = cache(async (): Promise<AuthAccountState> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { user: null, account: null };

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { user: null, account: null };

  const { data, error: accountError } = await supabase
    .from("user_accounts")
    .select(ACCOUNT_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    user,
    account: accountError || !data ? null : (data as UserAccount),
  };
});

export async function getCurrentAccount(): Promise<UserAccount | null> {
  const { account } = await readAuthAccountState();
  return account;
}

export async function requireActiveAccount(
  nextPath = "/",
): Promise<ActiveAccountContext> {
  const { user, account } = await readAuthAccountState();

  if (!user) {
    const safeNextPath = getSafeNextPath(nextPath) ?? "/";
    redirect(`/login?next=${encodeURIComponent(safeNextPath)}`);
  }

  if (!account) {
    redirect("/auth/signout?error=account_not_allowed");
  }

  if (!account.is_active) {
    redirect("/auth/signout?error=account_disabled");
  }

  return { user, account };
}

export async function requireAdmin(
  nextPath = "/",
): Promise<ActiveAccountContext> {
  const context = await requireActiveAccount(nextPath);

  if (context.account.role !== "admin") {
    redirect("/");
  }

  return context;
}

/**
 * Root-layout guard: middleware handles anonymous protected requests, while
 * this guard validates the authorization row for any authenticated session.
 */
export async function validateAuthenticatedAccount(): Promise<ActiveAccountContext | null> {
  const { user, account } = await readAuthAccountState();
  if (!user) return null;

  if (!account) {
    redirect("/auth/signout?error=account_not_allowed");
  }

  if (!account.is_active) {
    redirect("/auth/signout?error=account_disabled");
  }

  return { user, account };
}
