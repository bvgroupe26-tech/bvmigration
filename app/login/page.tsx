import { redirect } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import { getSession } from "@/lib/auth";
import { getHomeRouteByRole } from "@/lib/session";
import LoginForm from "@/components/auth/LoginForm";
import LoginCardEntrance from "./LoginCardEntrance";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(getHomeRouteByRole(session.role));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F7FB] px-6">
      <div className="fixed inset-x-0 top-0 h-0.5 bv-gradient-bar" />
      <main className="mx-auto flex w-full max-w-md flex-col items-center py-10">
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="BV Group"
            width={72}
            height={72}
            className="rounded-2xl shadow-md"
            priority
          />
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-[#1F3F73]">
            BV Group
          </h1>
          <p className="mt-1 text-sm text-slate-600">Espace RH — Connexion</p>
        </div>

        <LoginCardEntrance>
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
            <div className="mb-7 text-center">
              <h2 className="font-display text-[28px] font-bold tracking-tight text-[#1F3F73]">
                Connexion
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Accédez à votre espace BV Group
              </p>
            </div>

            <div className="relative mb-6 h-px bg-slate-200" />

            <Suspense fallback={<div className="h-48 w-full animate-pulse rounded-xl bg-slate-100" />}>
              <LoginForm />
            </Suspense>

            <div className="mt-6 rounded-xl border border-[#d9e4f5] bg-[#f4f8ff] p-3.5 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1F3F73]">
                Compte de démonstration
              </p>
              <p className="mt-1 font-mono text-[11px] text-slate-600">
                admin@bvgroupe.com · Admin@2026
              </p>
            </div>
          </div>
        </LoginCardEntrance>

        <p className="mt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} BV GROUPE — Gestion RH
        </p>
      </main>
    </div>
  );
}
