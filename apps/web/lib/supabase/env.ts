export interface EnvValidationResult {
  configured: boolean;
  missingKeys: string[];
  invalidKeys: string[];
}

export function validateSupabaseEnv(): EnvValidationResult {
  const missingKeys: string[] = [];
  const invalidKeys: string[] = [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !url.trim()) {
    missingKeys.push("NEXT_PUBLIC_SUPABASE_URL");
  } else {
    try {
      const parsed = new URL(url.trim());
      if (!parsed.protocol.startsWith("http")) {
        invalidKeys.push("NEXT_PUBLIC_SUPABASE_URL");
      }
    } catch {
      invalidKeys.push("NEXT_PUBLIC_SUPABASE_URL");
    }
  }

  if (!anonKey || !anonKey.trim()) {
    missingKeys.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const configured = missingKeys.length === 0 && invalidKeys.length === 0;

  return {
    configured,
    missingKeys,
    invalidKeys,
  };
}
