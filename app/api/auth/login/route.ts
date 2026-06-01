import type { NextRequest } from "next/server";
import { proxyAuthToNest } from "@/lib/auth-proxy-server";

export async function POST(req: NextRequest) {
  return proxyAuthToNest("/auth/login", {
    method: "POST",
    body: await req.text(),
    incomingCookie: req.headers.get("cookie"),
  });
}
