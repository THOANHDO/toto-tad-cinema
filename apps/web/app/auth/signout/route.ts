import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_ERRORS = new Set(["account_disabled", "account_not_allowed"]);

export async function GET(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  const requestedError = request.nextUrl.searchParams.get("error");

  if (requestedError && ALLOWED_ERRORS.has(requestedError)) {
    loginUrl.searchParams.set("error", requestedError);
  }

  const response = NextResponse.redirect(loginUrl);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.signOut();
  return response;
}
