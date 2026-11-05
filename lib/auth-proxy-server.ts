import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { TOKEN_COOKIE_NAME } from "@/lib/auth";
import { getTokenMaxAgeSeconds } from "@/lib/session";

const DEFAULT_LOCAL_API = "http://127.0.0.1:3001";
const DEFAULT_PROD_API = "https://bvback.onrender.com";

export const REFRESH_COOKIE_NAME = "refresh_token";
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7;
const UPSTREAM_TIMEOUT_MS = 30_000;

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
  let sameSite: "lax" | "strict" | "none" = "lax";

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

function extractAccessTokenFromBody(body: string): string | null {
  try {
    const json = JSON.parse(body) as Record<string, unknown>;
    const data = json?.data !== undefined ? json.data : json;
    if (typeof data === "string" && data.split(".").length === 3) return data;
    if (data && typeof data === "object") {
      const o = data as Record<string, unknown>;
      const token = o.access_token ?? o.accessToken ?? o.token;
      if (typeof token === "string" && token) return token;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function setAccessTokenCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getTokenMaxAgeSeconds(token, TOKEN_MAX_AGE),
  });
}

async function clearAuthCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete(REFRESH_COOKIE_NAME);
  jar.delete(TOKEN_COOKIE_NAME);
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
  const isProd = process.env.NODE_ENV === "production";

  for (const raw of rawCookies) {
    const parsed = parseSetCookieHeader(raw);
    if (!parsed) continue;

    const nameLower = parsed.name.toLowerCase();
    if (nameLower === "refresh_token" || nameLower === "refreshtoken") {
      jar.set(REFRESH_COOKIE_NAME, parsed.value, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: parsed.maxAge && parsed.maxAge > 0 ? parsed.maxAge : 60 * 60 * 24 * 30,
      });
      continue;
    }

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

  // Inférieur au timeout client (35 s) pour que le navigateur reçoive un 503 propre plutôt qu'un abort.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let upstream: Response;
  let body: string;
  try {
    upstream = await fetch(`${getNestApiBase()}${path}`, {
      ...fetchInit,
      headers,
      cache: "no-store",
      signal: controller.signal,
    });
    body = await upstream.text();
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      {
        ok: false,
        error: timedOut
          ? "Le serveur met du temps à répondre (démarrage en cours). Réessayez dans un instant."
          : "Serveur d'authentification injoignable.",
      },
      { status: 503, headers: { "Retry-After": "5" } }
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (clearRefreshCookie) {
    await clearAuthCookies();
  } else {
    await applySetCookiesFromUpstream(upstream);
    if (upstream.ok && (path === "/auth/login" || path === "/auth/refresh")) {
      const accessToken = extractAccessTokenFromBody(body);
      if (accessToken) {
        await setAccessTokenCookie(accessToken);
      }
    }
  }

  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}
