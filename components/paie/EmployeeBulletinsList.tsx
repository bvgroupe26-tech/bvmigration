"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronRight, FileDown, Wallet } from "lucide-react";
import { EmployeeEmpty, EmployeeError, EmployeeLoading } from "@/components/employee/EmployeeState";
import { useMyBulletins, downloadBulletinPdf } from "@/hooks/paie";
import { getUserErrorMessage } from "@/lib/fetcher";
import { formatFcfa, periodeLabel, BULLETIN_TYPE_LABELS, type BulletinDetail } from "@/lib/types-paie";

function netOf(b: BulletinDetail): number | null {
  return b.totaux.netAPayer ?? b.legacy.salaire_net;
}

export default function EmployeeBulletinsList() {
  const { bulletins, isLoading, error } = useMyBulletins();
  const [downloading, setDownloading] = useState<number | null>(null);

  async function download(b: BulletinDetail) {
    setDownloading(b.id);
    try {
      await downloadBulletinPdf(b.id, b.numero);
    } catch (err) {
      toast.error(getUserErrorMessage(err, "Impossible de télécharger le PDF."));
    } finally {
      setDownloading(null);
    }
  }

  if (isLoading) return <EmployeeLoading />;
  if (error) return <EmployeeError message="Impossible de charger vos bulletins." />;
  if (bulletins.length === 0) {
    return (
      <EmployeeEmpty icon={Wallet} title="Aucun bulletin" description="Vos bulletins de paie payés apparaîtront ici." />
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="font-display text-xl font-bold text-slate-900">Mes bulletins de paie</h1>
        <p className="mt-1 text-sm text-slate-500">Consultez et téléchargez vos bulletins au format PDF.</p>
      </div>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {bulletins.map((b) => (
          <li key={b.id} className="flex items-center gap-3 px-4 py-3">
            <Link href={`/employee/paie/${b.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F0FA] text-[#2F5F9D]">
                <Wallet className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">
                  {periodeLabel(b.mois, b.annee)}
                  {b.type !== "normal" && (
                    <span className="ml-2 text-xs font-medium text-amber-700">{BULLETIN_TYPE_LABELS[b.type]}</span>
                  )}
                </p>
                <p className="truncate text-xs text-slate-500">
                  Net {formatFcfa(netOf(b))}
                  {b.numero ? ` · N° ${b.numero}` : ""}
                </p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-300" />
            </Link>
            <button
              type="button"
              onClick={() => download(b)}
              disabled={downloading === b.id}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              aria-label={`Télécharger le bulletin ${periodeLabel(b.mois, b.annee)}`}
            >
              <FileDown className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
