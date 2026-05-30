import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getTokenMaxAgeSeconds } from "@/lib/session";

const TOKEN_COOKIE_NAME = "bv-token";
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

export async function POST(req: Request) {
  try {
    const { token } = (await req.json()) as { token?: string };
    if (!token || typeof token !== "string") {
      return NextResponse.json({ ok: false, error: "Token manquant" }, { status: 400 });
    }

    const c = await cookies();
    c.delete(TOKEN_COOKIE_NAME);
    const maxAge = getTokenMaxAgeSeconds(token, TOKEN_MAX_AGE);
    c.set(TOKEN_COOKIE_NAME, token, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE() {
  const c = await cookies();
  c.delete(TOKEN_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
