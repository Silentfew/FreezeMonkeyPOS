import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "pos_session";

const PUBLIC_PREFIXES = ["/_next", "/favicon", "/assets", "/public"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/session")) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.get(SESSION_COOKIE)?.value;

  if (pathname === "/login") {
    if (hasSession) {
      const homeUrl = new URL("/", request.url);
      return NextResponse.redirect(homeUrl);
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
