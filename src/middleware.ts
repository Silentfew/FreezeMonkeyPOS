import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { parseSessionCookie, SESSION_COOKIE } from "@/lib/session";

const PUBLIC_PREFIXES = ["/_next", "/favicon", "/assets", "/public"];

export function middleware(request: NextRequest) {
  const rawSession = request.cookies.get(SESSION_COOKIE)?.value;
  const session = parseSessionCookie(rawSession);
  const role = session?.role ?? null;
  const isAuth = Boolean(role);
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/session")) {
    return NextResponse.next();
  }

  const requiresAuth =
    pathname.startsWith("/pos") || pathname.startsWith("/admin");

  const isAdminRoute = pathname.startsWith("/admin");

  if (!isAuth && requiresAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAdminRoute && role !== "OWNER") {
    const url = request.nextUrl.clone();
    url.pathname = "/pos";
    return NextResponse.redirect(url);
  }

  if (isAuth && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/pos";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/pos/:path*", "/admin/:path*"],
};
