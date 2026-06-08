import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeJwtPayload, isJwtExpired, normalizeAppRole } from "@/lib/session";

const LEGACY_TOKEN_COOKIE = "bv-token";
const REFRESH_COOKIE = "refresh_token";

const PUBLIC_PAGES = new Set(["/", "/login"]);

function parseRoleFromToken(token: string): ReturnType<typeof normalizeAppRole> {
  const payload = decodeJwtPayload(token);
  return normalizeAppRole(payload?.role?.toString());
}

function getLegacyToken(req: NextRequest): string | null {
  const token = req.cookies.get(LEGACY_TOKEN_COOKIE)?.value;
  if (!token || token.split(".").length !== 3) return null;
  return token;
}

function hasRefreshCookie(req: NextRequest): boolean {
  return Boolean(req.cookies.get(REFRESH_COOKIE)?.value);
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (PUBLIC_PAGES.has(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/_next/") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // Session gérée côté client (refresh_token HttpOnly + access token mémoire).
  const legacyToken = getLegacyToken(req);
  if (!legacyToken && !hasRefreshCookie(req)) {
    return NextResponse.next();
  }

  if (!legacyToken) {
    return NextResponse.next();
  }

  const payload = decodeJwtPayload(legacyToken);
  if (!payload || isJwtExpired(payload)) {
    const res = NextResponse.next();
    res.cookies.delete(LEGACY_TOKEN_COOKIE);
    return res;
  }

  const role = parseRoleFromToken(legacyToken);

  if (pathname.startsWith("/employee") && role && role !== "employee") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Lien RH / notification / push vers /paie/:id → espace employé (évite renvoi à l'accueil).
  const paieDetailMatch = pathname.match(/^\/paie\/(\d+)$/);
  if (role === "employee" && paieDetailMatch) {
    const target = new URL(`/employee/paie/${paieDetailMatch[1]}`, req.url);
    target.search = req.nextUrl.search;
    return NextResponse.redirect(target);
  }

  if (!pathname.startsWith("/employee") && role === "employee" && pathname !== "/") {
    return NextResponse.redirect(new URL("/employee/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
