import "server-only";
import { NextResponse } from "next/server";

const DEFAULT_LOCAL_API = "http://127.0.0.1:3001";
const DEFAULT_PROD_API = "https://bv-groupe.onrender.com";

/** URL absolue de l'API Nest (côté serveur Next uniquement). */
export function getNestApiBase(): string {
  const target =
    process.env.API_PROXY_TARGET ??
    (process.env.NODE_ENV === "production" ? DEFAULT_PROD_API : DEFAULT_LOCAL_API);
  const base = target.replace(/\/$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

/** Retire Domain= pour que le cookie soit posé sur l'hôte frontend (Vercel). */
export function stripCookieDomain(setCookie: string): string {
  return setCookie
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part && !/^domain=/i.test(part))
    .join("; ");
}

export function forwardSetCookies(from: Response, to: NextResponse): void {
  const list =
    typeof from.headers.getSetCookie === "function"
      ? from.headers.getSetCookie()
      : [];

  if (list.length > 0) {
    for (const raw of list) {
      to.headers.append("Set-Cookie", stripCookieDomain(raw));
    }
    return;
  }

  const single = from.headers.get("set-cookie");
  if (single) {
    to.headers.append("Set-Cookie", stripCookieDomain(single));
  }
}

export async function proxyAuthToNest(
  path: string,
  init: RequestInit & { incomingCookie?: string | null }
): Promise<NextResponse> {
  const { incomingCookie, ...fetchInit } = init;
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
  const response = new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
    },
  });

  forwardSetCookies(upstream, response);
  return response;
}
