import type { NextRequest } from "next/server";
import { proxyAuthToNest } from "@/lib/auth-proxy-server";

export async function POST(req: NextRequest) {
  return proxyAuthToNest("/auth/refresh", {
    method: "POST",
    incomingCookie: req.headers.get("cookie"),
  });
}
