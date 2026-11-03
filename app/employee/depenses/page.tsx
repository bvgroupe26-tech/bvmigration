"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, Receipt } from "lucide-react";
import Modal from "@/components/ui/Modal";
import DepenseStatutBadge from "@/components/budget/DepenseStatutBadge";
import BudgetDepenseForm from "@/components/forms/BudgetDepenseForm";
import { EmployeeEmpty, EmployeeError, EmployeeLoading } from "@/components/employee/EmployeeState";
import {
  useFinanceCategories,
  useFinanceDepenses,
  useFinanceEnveloppes,
  useParametresFinance,
} from "@/hooks/budget";
import { useRouter } from "next/navigation";
import { formatFCFA } from "@/lib/utils";
import type { DepenseFinance } from "@/lib/types-finance";

function formatDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function sumBy(list: DepenseFinance[], statuts: DepenseFinance["statut"][]): number {
  return list.filter((d) => statuts.includes(d.statut)).reduce((s, d) => s + d.montant_ttc, 0);
}

export default function EmployeeDepensesPage() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const { depenses, isLoading, error, mutate } = useFinanceDepenses({ mine: 1, limit: 100 });
  const { enveloppes, error: envError } = useFinanceEnveloppes({ statut: "actif" }, showForm);
  const { categories } = useFinanceCategories(showForm);
  const { parametres } = useParametresFinance();

  if (isLoading) return <EmployeeLoading />;

  const enCours = sumBy(depenses, ["brouillon", "soumise", "validee_n1", "validee"]);
  const rembourse = sumBy(depenses, ["payee"]);

  return (
    <div className="space-y-4">
      {error ? <EmployeeError message="Impossible de charger vos notes de frais." /> : null}

      <section className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">En cours</p>
          <p className="mt-1 font-mono text-base font-bold text-slate-900">{formatFCFA(enCours)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Remboursé</p>
          <p className="mt-1 font-mono text-base font-bold text-emerald-700">{formatFCFA(rembourse)}</p>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#2F5F9D] to-[#1F3F73] px-4 py-3.5 text-sm font-semibold text-white shadow-md"
      >
        <Plus className="h-4 w-4" />
        Nouvelle note de frais
      </button>

      {depenses.length === 0 && !error ? (
        <EmployeeEmpty
          icon={Receipt}
          title="Aucune note de frais"
          description="Déclarez une dépense avancée pour l'entreprise, joignez le reçu et suivez son remboursement."
        />
      ) : (
        <ul className="space-y-2">
          {depenses.map((d) => (
            <li key={d.id}>
              <Link
                href={`/employee/depenses/${d.id}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{d.libelle}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {formatDate(d.date_depense)} · {d.numero}
                  </p>
                  <div className="mt-2">
                    <DepenseStatutBadge statut={d.statut} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-bold text-slate-900">{formatFCFA(d.montant_ttc)}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle note de frais" size="lg">
        {showForm ? (
          envError ? (
            <EmployeeError message="Les enveloppes budgétaires ne sont pas accessibles. Contactez le service RH." />
          ) : (
            <BudgetDepenseForm
              enveloppes={enveloppes}
              categories={categories}
              parametres={parametres}
              allowFournisseur={false}
              onCancel={() => setShowForm(false)}
              onSuccess={(id) => {
                setShowForm(false);
                void mutate();
                if (id) router.push(`/employee/depenses/${id}`);
              }}
            />
          )
        ) : null}
      </Modal>
    </div>
  );
}
