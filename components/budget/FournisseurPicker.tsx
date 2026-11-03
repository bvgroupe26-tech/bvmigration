"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/Field";
import { useFournisseurs } from "@/hooks/budget";
import { createFournisseur } from "@/lib/budget-api";
import { normalizeFournisseur } from "@/lib/budget-normalizers";
import { getUserErrorMessage } from "@/lib/api-errors";
import { cn } from "@/lib/utils";

type Props = {
  value: number | null;
  label: string | null;
  onChange: (id: number | null, nom: string | null) => void;
  allowCreate?: boolean;
};

export default function FournisseurPicker({ value, label, onChange, allowCreate = true }: Props) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const { fournisseurs, isLoading, mutate } = useFournisseurs(debounced, open);
  const actifs = fournisseurs.filter((f) => f.actif);
  const exact = actifs.some((f) => f.nom.trim().toLowerCase() === query.trim().toLowerCase());

  async function quickCreate() {
    const nom = query.trim();
    if (nom.length < 2) return;
    setCreating(true);
    try {
      const created = normalizeFournisseur(await createFournisseur({ nom }));
      toast.success(`Fournisseur « ${created.nom || nom} » créé`);
      onChange(created.id, created.nom || nom);
      setQuery("");
      setOpen(false);
      void mutate();
    } catch (e) {
      toast.error(getUserErrorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  if (value && !open) {
    return (
      <div className="flex h-10 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm">
        <span className="flex min-w-0 items-center gap-2 text-slate-900">
          <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate">{label ?? `Fournisseur #${value}`}</span>
        </span>
        <button
          type="button"
          onClick={() => onChange(null, null)}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Retirer le fournisseur"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Rechercher un fournisseur (nom, NIU)…"
        className="h-10 w-full"
        autoComplete="off"
      />
      {open ? (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          {isLoading && actifs.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-500">Recherche…</p>
          ) : null}
          {actifs.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                onChange(f.id, f.nom);
                setQuery("");
                setOpen(false);
              }}
              className={cn(
                "flex w-full flex-col items-start rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50",
                f.id === value && "bg-slate-50"
              )}
            >
              <span className="font-medium text-slate-900">{f.nom}</span>
              {f.niu || f.telephone ? (
                <span className="text-[11px] text-slate-500">
                  {[f.niu && `NIU ${f.niu}`, f.telephone].filter(Boolean).join(" · ")}
                </span>
              ) : null}
            </button>
          ))}
          {!isLoading && actifs.length === 0 && !query.trim() ? (
            <p className="px-3 py-2 text-xs text-slate-500">Aucun fournisseur enregistré.</p>
          ) : null}
          {allowCreate && query.trim().length >= 2 && !exact ? (
            <button
              type="button"
              onClick={() => void quickCreate()}
              disabled={creating}
              className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-slate-100 px-3 py-2 text-left text-sm font-medium text-[#2F5F9D] hover:bg-[#f4f8ff] disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {creating ? "Création…" : `Créer « ${query.trim()} »`}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
