import { NextResponse, type NextRequest } from "next/server";

const OPHIM_BASE_URL = process.env.NEXT_PUBLIC_OPHIM_API_URL || "https://phimapi.com";
const FALLBACK_BASE_URL = "https://phimapi.com";

// Blocked patterns: no external URLs, video files, or embed proxying
const BLOCKED_PATTERNS = [
  /\.m3u8$/i,
  /\.ts$/i,
  /\.mp4$/i,
  /\/embed\//i,
  /^https?:\/\//i,
  /^\/\//,
];

async function fetchUpstream(baseUrl: string, pathString: string, searchParams: string): Promise<any | null> {
  const upstreamUrl = `${baseUrl}/${pathString}${searchParams ? `?${searchParams}` : ""}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json, text/plain, */*",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json") && !contentType.includes("text/plain")) {
      return null;
    }

    return await response.json();
  } catch (_err) {
    clearTimeout(timeoutId);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams?.path;

    if (!path || path.length === 0) {
      return NextResponse.json({ error: "Path parameter is required" }, { status: 400 });
    }

    const pathString = path.join("/");

    // Validate path
    if (BLOCKED_PATTERNS.some((pattern) => pattern.test(pathString))) {
      return NextResponse.json({ error: "Invalid or unsupported path" }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams.toString();

    // 1. Try primary upstream
    let data = await fetchUpstream(OPHIM_BASE_URL, pathString, searchParams);

    // 2. Fallback if primary failed and is different from fallback
    if (!data && OPHIM_BASE_URL !== FALLBACK_BASE_URL) {
      data = await fetchUpstream(FALLBACK_BASE_URL, pathString, searchParams);
    }

    if (!data) {
      return NextResponse.json(
        { error: "Failed to fetch from upstream provider" },
        { status: 502 }
      );
    }

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      return NextResponse.json({ error: "Upstream request timeout" }, { status: 504 });
    }
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
