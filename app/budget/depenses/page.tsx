"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Paperclip, Plus } from "lucide-react";
import BudgetSubNav from "@/components/budget/BudgetSubNav";
import DepenseStatutBadge from "@/components/budget/DepenseStatutBadge";
import DepenseActions from "@/components/budget/DepenseActions";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import SearchField from "@/components/ui/SearchField";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import { NativeSelect } from "@/components/ui/Field";
import BudgetDepenseForm from "@/components/forms/BudgetDepenseForm";
import { useAuth } from "@/context/AuthContext";
import {
  useFinanceCategories,
  useFinanceDepenses,
  useFinanceEnveloppes,
  useFournisseurs,
  useParametresFinance,
} from "@/hooks/budget";
import { DEPENSE_STATUT_LABELS, depensePermissions } from "@/lib/budget-depense-utils";
import { getUserErrorMessage } from "@/lib/api-errors";
import { normalizeAppRole } from "@/lib/session";
import { cn, formatFCFA } from "@/lib/utils";
import type { BudgetDepenseStatut, DepenseFilters, DepenseFinance } from "@/lib/types-finance";

type Tab = "toutes" | "a_valider" | "a_payer" | "mes" | "payees";

const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function DepensesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const role = normalizeAppRole(user?.role);
  const isRhAdmin = role === "rh" || role === "admin";

  const [tab, setTab] = useState<Tab>("toutes");
  const [page, setPage] = useState(1);
  const [statut, setStatut] = useState<BudgetDepenseStatut | "">("");
  const [enveloppeId, setEnveloppeId] = useState<number | "">("");
  const [categorieId, setCategorieId] = useState<number | "">("");
  const [fournisseurId, setFournisseurId] = useState<number | "">("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(searchParams.get("nouveau") === "1");

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [tab, statut, enveloppeId, categorieId, fournisseurId, q]);

  const filters = useMemo<DepenseFilters>(() => {
    const f: DepenseFilters = {
      page,
      limit: PAGE_SIZE,
      enveloppe_id: enveloppeId || undefined,
      categorie_id: categorieId || undefined,
      fournisseur_id: fournisseurId || undefined,
      q: q || undefined,
    };
    if (tab === "a_valider") f.statut = role === "admin" && statut === "validee_n1" ? "validee_n1" : "soumise";
    else if (tab === "a_payer") f.statut = "validee";
    else if (tab === "payees") f.statut = "payee";
    else {
      if (tab === "mes") f.mine = 1;
      if (statut) f.statut = statut;
    }
    return f;
  }, [tab, page, statut, enveloppeId, categorieId, fournisseurId, q, role]);

  const { depenses, total, isLoading, error, mutate } = useFinanceDepenses(filters);
  const { enveloppes } = useFinanceEnveloppes();
  const { categories } = useFinanceCategories();
  const { fournisseurs } = useFournisseurs();
  const { parametres } = useParametresFinance();

  const actor = user ? { id: user.id, role: user.role } : null;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showRowActions = tab === "a_valider" || tab === "a_payer";

  const tabs: Array<{ key: Tab; label: string; visible: boolean }> = [
    { key: "toutes", label: "Toutes", visible: true },
    { key: "a_valider", label: "À valider", visible: role !== "employee" },
    { key: "a_payer", label: "À payer", visible: isRhAdmin },
    { key: "mes", label: "Mes dépenses", visible: true },
    { key: "payees", label: "Payées", visible: true },
  ];

  const columns: Column<DepenseFinance>[] = [
    {
      key: "date",
      header: "Date",
      render: (d) => <span className="font-mono text-xs text-slate-700">{formatDate(d.date_depense)}</span>,
    },
    {
      key: "libelle",
      header: "Dépense",
      render: (d) => (
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-medium text-slate-900">
            <span className="truncate">{d.libelle}</span>
            {d.pieces.length > 0 ? <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-label="Pièce jointe" /> : null}
          </p>
          <p className="truncate text-[11px] text-slate-500">
            {d.numero}
            {d.demandeur_nom ? ` · ${d.demandeur_nom}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "imputation",
      header: "Imputation",
      render: (d) => (
        <div className="text-xs text-slate-600">
          <p className="truncate">{d.enveloppe_libelle ?? "—"}</p>
          {d.categorie_libelle ? <p className="truncate text-slate-400">{d.categorie_libelle}</p> : null}
        </div>
      ),
    },
    {
      key: "fournisseur",
      header: "Fournisseur",
      render: (d) => <span className="text-sm text-slate-600">{d.fournisseur_nom ?? "—"}</span>,
    },
    {
      key: "montant",
      header: "TTC",
      align: "right",
      render: (d) => <span className="font-mono font-semibold text-slate-900">{formatFCFA(d.montant_ttc)}</span>,
    },
    {
      key: "statut",
      header: "Statut",
      render: (d) => <DepenseStatutBadge statut={d.statut} />,
    },
    ...(showRowActions
      ? [
          {
            key: "actions",
            header: "",
            align: "right" as const,
            render: (d: DepenseFinance) => (
              <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
                <DepenseActions
                  compact
                  depense={d}
                  perms={depensePermissions(d, actor, parametres)}
                  onDone={() => void mutate()}
                />
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <BudgetSubNav />
      <SectionHeader
        title="Dépenses"
        subtitle="Demandes, validations et paiements, avec pièces justificatives et historique"
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAdd(true)}>
            Nouvelle dépense
          </Button>
        }
      />

      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {tabs
          .filter((t) => t.visible)
          .map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
                setStatut("");
              }}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                tab === t.key ? "bv-tab-active" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              {t.label}
            </button>
          ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <SearchField
          placeholder="Libellé, référence…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          wrapperClassName="lg:col-span-1"
        />
        {tab === "toutes" || tab === "mes" ? (
          <NativeSelect value={statut} onChange={(e) => setStatut(e.target.value as BudgetDepenseStatut | "")} aria-label="Statut">
            <option value="">Tous les statuts</option>
            {(Object.keys(DEPENSE_STATUT_LABELS) as BudgetDepenseStatut[]).map((s) => (
              <option key={s} value={s}>
                {DEPENSE_STATUT_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        ) : tab === "a_valider" && role === "admin" ? (
          <NativeSelect
            value={statut === "validee_n1" ? "validee_n1" : "soumise"}
            onChange={(e) => setStatut(e.target.value as BudgetDepenseStatut)}
            aria-label="Niveau de validation"
          >
            <option value="soumise">Niveau 1 (soumises)</option>
            <option value="validee_n1">Niveau 2 (validées N1)</option>
          </NativeSelect>
        ) : (
          <div className="hidden lg:block" />
        )}
        <NativeSelect value={enveloppeId} onChange={(e) => setEnveloppeId(e.target.value ? Number(e.target.value) : "")} aria-label="Enveloppe">
          <option value="">Toutes les enveloppes</option>
          {enveloppes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.libelle} ({e.annee})
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={categorieId} onChange={(e) => setCategorieId(e.target.value ? Number(e.target.value) : "")} aria-label="Catégorie">
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.libelle}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          value={fournisseurId}
          onChange={(e) => setFournisseurId(e.target.value ? Number(e.target.value) : "")}
          aria-label="Fournisseur"
        >
          <option value="">Tous les fournisseurs</option>
          {fournisseurs.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nom}
            </option>
          ))}
        </NativeSelect>
      </div>

      <GlassCard className="p-0">
        {isLoading && depenses.length === 0 ? (
          <Skeleton className="h-64 w-full" />
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-sm text-slate-600">{getUserErrorMessage(error)}</p>
            <Button variant="primary" className="mt-4" onClick={() => void mutate()}>
              Réessayer
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={depenses}
            rowKey={(d) => d.id}
            onRowClick={(d) => router.push(`/budget/depenses/${d.id}`)}
            emptyMessage={tab === "a_valider" ? "Aucune dépense en attente de validation." : "Aucune dépense."}
          />
        )}
        {total > PAGE_SIZE ? (
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
            <span>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} sur {total}
            </span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Page précédente">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 py-1 font-mono text-xs">
                {page} / {pages}
              </span>
              <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Page suivante">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </GlassCard>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouvelle dépense" size="lg">
        {showAdd ? (
          <BudgetDepenseForm
            enveloppes={enveloppes}
            categories={categories}
            parametres={parametres}
            onCancel={() => setShowAdd(false)}
            onSuccess={(id) => {
              setShowAdd(false);
              void mutate();
              if (id) router.push(`/budget/depenses/${id}`);
            }}
          />
        ) : null}
      </Modal>
    </div>
  );
}

export default function BudgetDepensesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
      <DepensesContent />
    </Suspense>
  );
}
