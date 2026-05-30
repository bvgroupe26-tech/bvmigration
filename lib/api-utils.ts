import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { isTechnicalMessage } from "@/lib/api-errors";

export function ok<T>(data: T, init?: number | ResponseInit) {
  const status = typeof init === "number" ? init : (init as ResponseInit)?.status ?? 200;
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: fail("JSON invalide", 400) };
  }
  try {
    const parsed = schema.parse(raw);
    return { ok: true, data: parsed };
  } catch (err) {
    if (err instanceof ZodError) {
      const msg = err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · ");
      return { ok: false, response: fail(msg, 422) };
    }
    return { ok: false, response: fail("Données invalides", 422) };
  }
}

export function wrap<T>(handler: () => T | Promise<T>) {
  return async () => {
    try {
      const data = await handler();
      return ok(data);
    } catch (err) {
      console.error("[API] Error:", err);
      const msg = err instanceof Error ? err.message : "Une erreur interne est survenue.";
      return fail(isTechnicalMessage(msg) ? "Une erreur interne est survenue." : msg, 500);
    }
  };
}

export const apiNoCache = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};
