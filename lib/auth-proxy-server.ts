import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const DEFAULT_LOCAL_API = "http://127.0.0.1:3001";
const DEFAULT_PROD_API = "https://bv-groupe.onrender.com";

export const REFRESH_COOKIE_NAME = "refresh_token";

/** URL absolue de l'API Nest (côté serveur Next uniquement). */
export function getNestApiBase(): string {
  const target =
    process.env.API_PROXY_TARGET ??
    (process.env.NODE_ENV === "production" ? DEFAULT_PROD_API : DEFAULT_LOCAL_API);
  const base = target.replace(/\/$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

type ParsedCookie = {
  name: string;
  value: string;
  maxAge?: number;
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
};

function parseSetCookieHeader(raw: string): ParsedCookie | null {
  const parts = raw.split(";").map((p) => p.trim());
  if (!parts[0]?.includes("=")) return null;

  const eq = parts[0].indexOf("=");
  const name = parts[0].slice(0, eq).trim();
  const value = parts[0].slice(eq + 1).trim();

  let maxAge: number | undefined;
  let path = "/";
  let httpOnly = false;
  let secure = process.env.NODE_ENV === "production";
  let sameSite: "lax" | "strict" | "none" = secure ? "none" : "lax";

  for (const part of parts.slice(1)) {
    const lower = part.toLowerCase();
    if (lower === "httponly") httpOnly = true;
    else if (lower === "secure") secure = true;
    else if (lower.startsWith("path=")) path = part.slice(5).trim() || "/";
    else if (lower.startsWith("max-age=")) maxAge = Number(part.slice(8));
    else if (lower.startsWith("samesite=")) {
      const v = part.slice(9).trim().toLowerCase();
      if (v === "strict" || v === "none" || v === "lax") sameSite = v;
    }
  }

  return { name, value, maxAge, path, httpOnly, secure, sameSite };
}

async function applySetCookiesFromUpstream(upstream: Response): Promise<void> {
  const list =
    typeof upstream.headers.getSetCookie === "function"
      ? upstream.headers.getSetCookie()
      : [];

  const fallback = upstream.headers.get("set-cookie");
  const rawCookies = list.length > 0 ? list : fallback ? [fallback] : [];

  if (rawCookies.length === 0) return;

  const jar = await cookies();

  for (const raw of rawCookies) {
    const parsed = parseSetCookieHeader(raw);
    if (!parsed) continue;

    jar.set(parsed.name, parsed.value, {
      httpOnly: parsed.httpOnly,
      secure: parsed.secure,
      sameSite: parsed.sameSite,
      path: parsed.path,
      ...(parsed.maxAge ? { maxAge: parsed.maxAge } : {}),
    });
  }
}

export async function proxyAuthToNest(
  path: string,
  init: RequestInit & { incomingCookie?: string | null; clearRefreshCookie?: boolean }
): Promise<NextResponse> {
  const { incomingCookie, clearRefreshCookie, ...fetchInit } = init;
  const headers = new Headers(fetchInit.headers);

  if (incomingCookie) {
    headers.set("Cookie", incomingCookie);
  }
  if (!headers.has("Content-Type") && fetchInit.body) {
    headers.set("Content-Type", "application/json");
  }

  const upstream = await fetch(`${getNestApiBase()}${path}`, {
    ...fetchInit,
    headers,
    cache: "no-store",
  });

  const body = await upstream.text();

  if (clearRefreshCookie) {
    const jar = await cookies();
    jar.delete(REFRESH_COOKIE_NAME);
  } else {
    await applySetCookiesFromUpstream(upstream);
  }

  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}
