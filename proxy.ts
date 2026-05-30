import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeJwtPayload, getHomeRouteByRole, isJwtExpired } from "@/lib/session";

const TOKEN_COOKIE = "bv-token";

const PUBLIC_PAGES = new Set(["/", "/register", "/register/employee"]);

function parseRoleFromToken(token: string): string | null {
  const payload = decodeJwtPayload(token);
  return payload?.role?.toString() ?? null;
}

function getToken(req: NextRequest): string | null {
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!token || token.split(".").length !== 3) return null;
  return token;
}

function redirectLoginAndClearToken(req: NextRequest, pathname: string) {
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", pathname);
  const res = NextResponse.redirect(loginUrl);
  res.cookies.delete(TOKEN_COOKIE);
  return res;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (pathname === "/login") {
    const token = getToken(req);
    if (!token) return NextResponse.next();
    const payload = decodeJwtPayload(token);
    if (!payload || isJwtExpired(payload)) {
      const res = NextResponse.next();
      res.cookies.delete(TOKEN_COOKIE);
      return res;
    }
    const role = parseRoleFromToken(token);
    return NextResponse.redirect(new URL(getHomeRouteByRole(role), req.url));
  }

  if (PUBLIC_PAGES.has(pathname)) return NextResponse.next();

  if (pathname.startsWith("/_next/") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  const token = getToken(req);
  if (!token) {
    return redirectLoginAndClearToken(req, pathname);
  }

  const payload = decodeJwtPayload(token);
  if (!payload || isJwtExpired(payload)) {
    return redirectLoginAndClearToken(req, pathname);
  }

  const role = parseRoleFromToken(token);

  if (pathname.startsWith("/employee") && role !== "employee") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (!pathname.startsWith("/employee") && role === "employee" && pathname !== "/") {
    return NextResponse.redirect(new URL("/employee/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
