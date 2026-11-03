"use client";

import { use } from "react";
import Image from "next/image";
import { CheckCircle2, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { useVerifyBulletin } from "@/hooks/paie";
import { formatFcfa } from "@/lib/types-paie";

export default function VerifyBulletinPage({ params }: { params: Promise<{ numero: string }> }) {
  const { numero: raw } = use(params);
  const numero = decodeURIComponent(raw);
  const { result, isLoading, error } = useVerifyBulletin(numero || null);
  const ok = Boolean(result?.valide && result.hashOk);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#F4F7FB] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="" width={36} height={36} className="rounded-lg" />
          <div>
            <p className="font-display text-base font-bold text-slate-900">Vérification de bulletin</p>
            <p className="font-mono text-xs text-slate-500">N° {numero}</p>
          </div>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Vérification en cours…
            </div>
          ) : error || !result ? (
            <Status
              tone="danger"
              icon={<XCircle className="h-6 w-6" />}
              title="Bulletin introuvable"
              text="Aucun bulletin validé ne correspond à ce numéro."
            />
          ) : ok ? (
            <Status
              tone="success"
              icon={<CheckCircle2 className="h-6 w-6" />}
              title="Bulletin authentique"
              text="Ce bulletin a bien été émis et validé par l'employeur, et son contenu n'a pas été modifié depuis."
            />
          ) : result.valide ? (
            <Status
              tone="warning"
              icon={<ShieldAlert className="h-6 w-6" />}
              title="Contenu non conforme"
              text="Le bulletin existe mais son empreinte ne correspond plus au document validé. Rapprochez-vous du service paie."
            />
          ) : (
            <Status
              tone="danger"
              icon={<XCircle className="h-6 w-6" />}
              title="Bulletin non valide"
              text="Ce bulletin n'est pas validé ou a été annulé."
            />
          )}
        </div>

        {result && (
          <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
            <Row label="Salarié" value={result.employe} />
            <Row label="Période" value={result.periode} />
            <Row label="Net à payer" value={result.netAPayer != null ? formatFcfa(result.netAPayer) : null} />
          </dl>
        )}

        <p className="mt-6 text-[11px] leading-relaxed text-slate-400">
          Pour protéger les données personnelles, seules les informations ci-dessus sont affichées.
        </p>
      </div>
    </main>
  );
}

function Status({
  tone,
  icon,
  title,
  text,
}: {
  tone: "success" | "warning" | "danger";
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    danger: "border-red-200 bg-red-50 text-red-900",
  }[tone];
  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3 ${styles}`}>
      <span className="shrink-0">{icon}</span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm opacity-90">{text}</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value ?? "—"}</dd>
    </div>
  );
}
