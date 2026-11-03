"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, FileDown, Printer, Wallet } from "lucide-react";
import BulletinPaieSheet from "@/components/paie/BulletinPaieSheet";
import BulletinLignesSheet from "@/components/paie/BulletinLignesSheet";
import { EmployeeEmpty, EmployeeError, EmployeeLoading } from "@/components/employee/EmployeeState";
import { useBulletin, downloadBulletinPdf } from "@/hooks/paie";
import { getUserErrorMessage } from "@/lib/fetcher";
import { periodeLabel } from "@/lib/types-paie";

export default function EmployeeBulletinView({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = use(params);
  const id = Number(idParam);
  const validId = Number.isFinite(id) && id > 0 ? id : null;
  const autoPrint = useSearchParams().get("print") === "1";
  const { bulletin, isLoading, error } = useBulletin(validId);
  const [downloading, setDownloading] = useState(false);
  const visible = bulletin && bulletin.statut === "paye" ? bulletin : null;

  useEffect(() => {
    if (!autoPrint || !visible) return;
    const timer = window.setTimeout(() => window.print(), 800);
    return () => window.clearTimeout(timer);
  }, [autoPrint, visible]);

  async function download() {
    if (!visible) return;
    setDownloading(true);
    try {
      await downloadBulletinPdf(visible.id, visible.numero);
    } catch (err) {
      toast.error(getUserErrorMessage(err, "Impossible de télécharger le PDF."));
    } finally {
      setDownloading(false);
    }
  }

  if (!validId) {
    return <EmployeeEmpty icon={Wallet} title="Bulletin invalide" description="L'identifiant du bulletin est incorrect." />;
  }
  if (isLoading) return <EmployeeLoading />;
  if (error && !bulletin) return <EmployeeError message="Impossible de charger ce bulletin." />;
  if (!visible) {
    return (
      <EmployeeEmpty
        icon={Wallet}
        title="Bulletin introuvable"
        description="Ce bulletin n'existe pas, n'est pas encore payé ou ne vous est pas accessible."
      />
    );
  }

  return (
    <div className="space-y-4 pb-8 print:space-y-0 print:pb-0">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/employee/paie"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Mes bulletins
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Imprimer
          </button>
          <button
            type="button"
            onClick={download}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2F5F9D] px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          >
            <FileDown className="h-4 w-4" />
            {downloading ? "Téléchargement…" : "PDF"}
          </button>
        </div>
      </div>

      <div className="no-print rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bulletin de paie</p>
        <p className="font-display text-lg font-bold text-slate-900">{periodeLabel(visible.mois, visible.annee)}</p>
      </div>

      {visible.moteur === "legacy" ? (
        <BulletinPaieSheet
          bulletin={visible.legacy}
          showStatutBadge={false}
          matricule={visible.employe.matricule}
          employeurNom={visible.employeur?.raisonSociale}
        />
      ) : (
        <BulletinLignesSheet bulletin={visible} showStatutBadge={false} />
      )}
    </div>
  );
}
