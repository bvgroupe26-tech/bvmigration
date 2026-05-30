import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { UserPlus } from "lucide-react";
import { getSession } from "@/lib/auth";
import RegisterForm from "@/components/auth/RegisterForm";
import LoginCardEntrance from "@/app/login/LoginCardEntrance";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="relative min-h-screen bg-[#F4F7FB] text-slate-900">
      <div className="h-0.5 bv-gradient-bar" />
      <header className="flex items-center justify-between border-b border-slate-200/80 bg-white px-6 py-5 lg:px-10">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="BV Group" className="h-11 w-11 rounded-xl shadow-sm ring-1 ring-slate-200" />
          <div className="flex flex-col leading-tight">
            <span className="font-display text-[17px] font-bold tracking-tight text-[#1F3F73]">BV GROUPE</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Gestion RH</span>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-slate-600 transition hover:text-[#2F5F9D]">
            Connexion
          </Link>
          <Link href="/" className="text-sm font-medium text-slate-600 transition hover:text-[#2F5F9D]">
            ← Accueil
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-col items-center px-6 pb-16 pt-10 sm:pt-14">
        <LoginCardEntrance>
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
            <div className="mb-7 text-center">
              <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bv-gradient-primary shadow-md">
                <UserPlus className="h-7 w-7 text-white" strokeWidth={2.2} />
              </div>
              <h1 className="mt-5 font-display text-[28px] font-bold tracking-tight text-[#1F3F73]">Créer un compte</h1>
              <p className="mt-1.5 text-sm text-slate-600">Espace administration RH / Manager</p>
            </div>

            <div className="relative mb-6 h-px bg-slate-200" />

            <Suspense fallback={<div className="h-64 w-full animate-pulse rounded-xl bg-slate-100" />}>
              <RegisterForm />
            </Suspense>
          </div>
        </LoginCardEntrance>

        <p className="mt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} BV GROUPE — Gestion RH
        </p>
      </main>
    </div>
  );
}
