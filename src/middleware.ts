import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "pos_session";

const PUBLIC_PREFIXES = ["/_next", "/favicon", "/assets", "/public"];

export function middleware(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const isAuth = Boolean(session);
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/session")) {
    return NextResponse.next();
  }

  const requiresAuth =
    pathname.startsWith("/pos") || pathname.startsWith("/admin");

  if (!isAuth && requiresAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
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
