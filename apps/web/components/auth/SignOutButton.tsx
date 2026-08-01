"use client";

import { clearUserScopedState } from "@/lib/auth/client-state";
import { createClient } from "@repo/database/client";
import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

interface SignOutButtonProps {
  className?: string;
  label?: string;
  onBeforeSignOut?: () => void;
}

export default function SignOutButton({
  className = "",
  label = "Đăng xuất",
  onBeforeSignOut,
}: SignOutButtonProps) {
  const router = useRouter();
  const pendingRef = useRef(false);
  const [isPending, setIsPending] = useState(false);

  const handleSignOut = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setIsPending(true);
    onBeforeSignOut?.();
    let destination = "/login";

    try {
      const supabase = createClient();
      if (supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) destination = "/auth/signout";
      } else {
        destination = "/auth/signout";
      }
    } catch {
      destination = "/auth/signout";
    } finally {
      clearUserScopedState();
      router.replace(destination);
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      className={className}
    >
      {isPending ? (
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut aria-hidden="true" className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}
