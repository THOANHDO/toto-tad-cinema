import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const readSingleValue = (value: string | null) => value?.split(",")[0]?.trim() || "";

export function GET(request: NextRequest) {
    const sourceParams = request.nextUrl.searchParams;
    const forwardedHost = request.headers.get("x-forwarded-host");
    const requestHost = forwardedHost || request.headers.get("host");
    const requestProtocol =
        request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "");
    const requestOrigin = requestHost
        ? `${requestProtocol}://${requestHost}`
        : request.nextUrl.origin;
    const destination = new URL("/tim-kiem-nang-cao", requestOrigin);
    const destinationParams = destination.searchParams;
    const category =
        readSingleValue(sourceParams.get("category")) ||
        readSingleValue(sourceParams.get("genre"));

    for (const key of ["q", "type"] as const) {
        const value = readSingleValue(sourceParams.get(key));
        if (value) destinationParams.set(key, value);
    }

    if (category) destinationParams.set("category", category);

    for (const key of ["country", "year", "page", "limit"] as const) {
        const value = readSingleValue(sourceParams.get(key));
        if (value) destinationParams.set(key, value);
    }

    return NextResponse.redirect(destination, 307);
}
