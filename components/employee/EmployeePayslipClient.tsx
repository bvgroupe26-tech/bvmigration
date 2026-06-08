"use client";

import { use, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Printer, Wallet } from "lucide-react";
import BulletinPaieSheet from "@/components/paie/BulletinPaieSheet";
import { EmployeeEmpty, EmployeeError, EmployeeLoading } from "@/components/employee/EmployeeState";
import { useEmployeMe, useMyPayslip } from "@/hooks/employee";
import { formatMoisPaie } from "@/lib/absence-utils";
import type { Paie } from "@/lib/types";

export default function EmployeePayslipClient({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = use(params);
  const id = Number(idParam);
  const validId = Number.isFinite(id) && id > 0 ? id : null;
  const searchParams = useSearchParams();
  const autoPrint = searchParams.get("print") === "1";

  const { bulletin: rawBulletin, isLoading, error } = useMyPayslip(validId);
  const { employe } = useEmployeMe();

  const bulletin = useMemo(() => {
    if (!rawBulletin) return null;
    if (rawBulletin.statut !== "paye") return null;
    if (employe && rawBulletin.employe_id && rawBulletin.employe_id !== employe.id) return null;
    return enrichBulletinWithEmploye(rawBulletin, employe);
  }, [rawBulletin, employe]);

  useEffect(() => {
    if (!autoPrint || !bulletin) return;
    const timer = window.setTimeout(() => window.print(), 800);
    return () => window.clearTimeout(timer);
  }, [autoPrint, bulletin]);

  if (!validId) {
    return (
      <EmployeeEmpty
        icon={Wallet}
        title="Bulletin invalide"
        description="L'identifiant du bulletin est incorrect."
      />
    );
  }

  if (isLoading) return <EmployeeLoading />;
  if (error) return <EmployeeError message="Impossible de charger ce bulletin." />;
  if (!bulletin) {
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
          href="/employee/documents"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux documents
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#2F5F9D] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
        >
          <Printer className="h-4 w-4" />
          Imprimer / PDF
        </button>
      </div>

      <div className="no-print rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bulletin de paie</p>
        <p className="font-display text-lg font-bold text-slate-900">
          {formatMoisPaie(String(bulletin.mois), bulletin.annee)}
        </p>
      </div>

      <BulletinPaieSheet bulletin={bulletin} showStatutBadge={false} />
    </div>
  );
}

function enrichBulletinWithEmploye(bulletin: Paie, employe: ReturnType<typeof useEmployeMe>["employe"]): Paie {
  if (!employe) return bulletin;
  return {
    ...bulletin,
    employe_id: bulletin.employe_id || employe.id,
    employe_nom: bulletin.employe_nom ?? employe.nom,
    employe_prenom: bulletin.employe_prenom ?? employe.prenom,
    employe_poste: bulletin.employe_poste ?? employe.poste ?? null,
  };
}
