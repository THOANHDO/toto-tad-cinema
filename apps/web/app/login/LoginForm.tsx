"use client";

import { clearUserScopedState } from "@/lib/auth/client-state";
import { mapSupabaseAuthError } from "@/lib/auth/error-mapping";
import { getSafeNextPath } from "@/lib/auth/redirect";
import { validateSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@repo/database/client";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

interface LoginFormProps {
  nextPath: string | null;
  initialError: string | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local.charAt(0)}***@${domain}`;
  return `${local.charAt(0)}***${local.charAt(local.length - 1)}@${domain}`;
}

function logAuthDev(stage: string, details?: Record<string, any>) {
  if (process.env.NODE_ENV !== "production") {
    const info = details ? JSON.stringify(details) : "";
    console.log(`[auth:${stage}] ${info}`);
  }
}

export default function LoginForm({ nextPath, initialError }: LoginFormProps) {
  const router = useRouter();
  const submittingRef = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(initialError);

  useEffect(() => {
    // Remove data left by an expired/invalid session before another account logs in.
    clearUserScopedState();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    logAuthDev("submit", { email: maskEmail(email) });

    // Step 1: Validate environment variables
    const envStatus = validateSupabaseEnv();
    if (!envStatus.configured) {
      logAuthDev("config", { missing: envStatus.missingKeys, invalid: envStatus.invalidKeys });
      setErrorMessage("Dịch vụ đăng nhập chưa được cấu hình. Vui lòng liên hệ quản trị viên.");
      return;
    }

    // Step 2: Validate input format
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail) || password.length === 0) {
      setErrorMessage("Email hoặc mật khẩu không chính xác.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      logAuthDev("config", { client: "null" });
      setErrorMessage("Dịch vụ đăng nhập chưa được cấu hình. Vui lòng liên hệ quản trị viên.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Step 3: Attempt sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error || !data.user) {
        logAuthDev("response", { status: "error", errorCategory: error?.code || error?.message });
        setErrorMessage(mapSupabaseAuthError(error));
        return;
      }

      logAuthDev("session", { userId: data.user.id });

      // Step 4: Verify user_accounts profile
      const { data: account, error: accountError } = await supabase
        .from("user_accounts")
        .select("user_id,is_active")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (accountError || !account) {
        logAuthDev("profile", { status: "missing_profile", userId: data.user.id });
        await supabase.auth.signOut();
        clearUserScopedState();
        setErrorMessage("Tài khoản này chưa được cấp quyền truy cập.");
        return;
      }

      if (!account.is_active) {
        logAuthDev("profile", { status: "inactive_account", userId: data.user.id });
        await supabase.auth.signOut();
        clearUserScopedState();
        setErrorMessage("Tài khoản này đã bị vô hiệu hóa");
        return;
      }

      logAuthDev("profile", { status: "active", userId: data.user.id });

      // Step 5: Success & Redirect
      const targetPath = getSafeNextPath(nextPath) ?? "/";
      logAuthDev("redirect", { targetPath });

      clearUserScopedState();
      router.replace(targetPath);
      router.refresh();
    } catch (err: unknown) {
      logAuthDev("response", { status: "exception" });
      setErrorMessage(mapSupabaseAuthError(err));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-[#07080b] px-4 py-8 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(231,51,67,0.17),transparent_34rem),radial-gradient(circle_at_86%_82%,rgba(109,120,255,0.12),transparent_30rem)]" />
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div className="absolute -left-16 top-[12%] hidden h-80 w-56 -rotate-6 rounded-[2rem] border border-white/8 bg-gradient-to-br from-white/6 to-transparent shadow-2xl blur-[0.2px] lg:block" />
        <div className="absolute -right-12 bottom-[8%] hidden h-96 w-64 rotate-6 rounded-[2rem] border border-white/8 bg-gradient-to-tl from-primary/10 to-transparent shadow-2xl blur-[0.2px] lg:block" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#07080b] to-transparent" />
      </div>

      <main className="relative z-10 w-full max-w-md">
        <div className="mb-7 flex justify-center">
          <div className="flex items-center gap-3" aria-label="ToTo TAD Cinema">
            <span className="relative h-14 w-14 overflow-hidden rounded-full border border-white/10 bg-[#101114] shadow-xl">
              <Image
                src="/brand/toto-tad-face.png"
                alt=""
                fill
                priority
                sizes="56px"
                className="object-cover"
              />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-xl font-black tracking-[-0.04em]">
                <span className="text-primary">ToTo</span>{" "}
                <span className="text-[#fff3e6]">TAD</span>
              </span>
              <span className="mt-1.5 text-[10px] font-bold tracking-[0.34em] text-[#d7d0c7]">
                CINEMA
              </span>
            </span>
          </div>
        </div>

        <section className="rounded-[1.5rem] border border-white/10 bg-[#111318]/92 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.58)] backdrop-blur-xl sm:p-8">
          <div className="mb-7 text-center sm:text-left">
            <p className="eyebrow">Không gian riêng tư</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.045em] text-white sm:text-4xl">
              Chào mừng trở lại
            </h1>
            <p className="mt-3 text-sm leading-6 text-foreground-secondary">
              Đăng nhập bằng tài khoản đã được cấp để tiếp tục xem phim.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-foreground">
                Email
              </label>
              <div className="relative">
                <Mail aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground-muted" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSubmitting}
                  className="min-h-12 w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-base text-white outline-none transition-[border-color,box-shadow] placeholder:text-foreground-muted focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-65"
                  placeholder="ten@gmail.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-foreground">
                Mật khẩu
              </label>
              <div className="relative">
                <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground-muted" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isSubmitting}
                  className="min-h-12 w-full rounded-xl border border-border bg-background py-3 pl-11 pr-12 text-base text-white outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-65"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  disabled={isSubmitting}
                  className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-white/5 hover:text-white"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-xl border border-error/25 bg-error/10 px-4 py-3 text-sm leading-5 text-[#ffb4b4]"
              >
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="button-primary min-h-12 w-full text-base disabled:translate-y-0 disabled:opacity-60"
            >
              {isSubmitting && <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />}
              {isSubmitting ? "Đang đăng nhập…" : "Đăng nhập"}
            </button>
          </form>

          <p className="mt-6 border-t border-white/8 pt-5 text-center text-xs leading-5 text-foreground-muted">
            Đây là website riêng tư. Tài khoản chỉ được cấp bởi quản trị viên.
          </p>
        </section>
      </main>
    </div>
  );
}
