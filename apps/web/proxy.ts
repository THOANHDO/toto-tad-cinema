import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next(?:/|$)|favicon.ico$|apple-icon.png$|icon.png$|brand(?:/|$)|file.svg$|globe.svg$|next.svg$|vercel.svg$|window.svg$|logo.png$).*)",
  ],
};
