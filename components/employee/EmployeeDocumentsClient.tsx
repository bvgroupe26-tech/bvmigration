"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Eye, FileText, Printer, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  useMyDocuments,
  useMyPayslips,
  downloadDocument,
} from "@/hooks/employee";
import { formatMonthYear } from "@/lib/employee/utils";
import { formatProrata } from "@/lib/paie-utils";
import {formatFCFA, getUserErrorMessage } from "@/lib/utils";
import { EmployeeEmpty, EmployeeError, EmployeeLoading } from "@/components/employee/EmployeeState";
import { cn } from "@/lib/utils";

type Tab = "documents" | "paie";

export default function EmployeeDocumentsClient() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("documents");
  const { documents, isLoading: loadingDocs, error: docsError } = useMyDocuments();
  const { payslips, isLoading: loadingPaie, error: paieError } = useMyPayslips();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const isLoading = tab === "documents" ? loadingDocs : loadingPaie;

  async function handleDocDownload(id: number, name?: string) {
    setDownloadingId(id);
    try {
      await downloadDocument(id, name);
      toast.success("Téléchargement lancé");
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  }

  function handlePaiePrint(id: number) {
    router.push(`/employee/paie/${id}?print=1`);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <TabButton active={tab === "documents"} onClick={() => setTab("documents")} label="Documents" />
        <TabButton active={tab === "paie"} onClick={() => setTab("paie")} label="Bulletins" />
      </div>

      {isLoading && <EmployeeLoading />}

      {tab === "documents" && !loadingDocs && (
        <>
          {docsError && <EmployeeError message="Impossible de charger vos documents." />}
          {documents.length === 0 ? (
            <EmployeeEmpty
              icon={FileText}
              title="Aucun document"
              description="Vos documents RH apparaîtront ici."
            />
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => {
                const title = doc.titre ?? doc.nom ?? `Document #${doc.id}`;
                return (
                  <article
                    key={doc.id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F0FA] text-[#2F5F9D]">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{title}</p>
                      <p className="text-xs text-slate-500">{doc.type ?? "Document RH"}</p>
                    </div>
                    <button
                      type="button"
                      disabled={downloadingId === doc.id}
                      onClick={() => handleDocDownload(doc.id, title)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-[#2F5F9D]"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "paie" && !loadingPaie && (
        <>
          {paieError && <EmployeeError message="Impossible de charger vos bulletins." />}
          {payslips.length === 0 ? (
            <EmployeeEmpty
              icon={Wallet}
              title="Aucun bulletin"
              description="Vos bulletins de paie payés apparaîtront ici."
            />
          ) : (
            <div className="space-y-2">
              {payslips.map((p) => {
                const prorata = formatProrata(p);
                return (
                <article
                  key={p.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F0FA] text-[#2F5F9D]">
                      <Wallet className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">
                        {formatMonthYear(p.mois, p.annee)}
                      </p>
                      {p.salaire_net != null && (
                        <p className="text-xs text-slate-500">{formatFCFA(p.salaire_net)}</p>
                      )}
                      {prorata && (
                        <p className="mt-0.5 text-[11px] font-medium text-amber-700">{prorata}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Link
                      href={`/employee/paie/${p.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-[#2F5F9D]"
                    >
                      <Eye className="h-4 w-4" />
                      Voir
                    </Link>
                    <button
                      type="button"
                      disabled={downloadingId === p.id}
                      onClick={() => handlePaiePrint(p.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2F5F9D] py-2.5 text-sm font-semibold text-white"
                    >
                      <Printer className="h-4 w-4" />
                      PDF
                    </button>
                  </div>
                </article>
              );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl py-2.5 text-sm font-semibold transition",
        active ? "bg-[#2F5F9D] text-white shadow-sm" : "text-slate-500"
      )}
    >
      {label}
    </button>
  );
}
