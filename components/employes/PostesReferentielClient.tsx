"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { usePostes } from "@/hooks/usePostes";

export default function PostesReferentielClient() {
  const { postes, addPoste, removePoste } = usePostes();
  const [label, setLabel] = useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const value = label.trim();
    if (value.length < 2) {
      toast.error("Le libellé du poste doit contenir au moins 2 caractères.");
      return;
    }
    if (postes.some((p) => p.toLowerCase() === value.toLowerCase())) {
      toast.error("Ce poste existe déjà.");
      return;
    }
    addPoste(value);
    setLabel("");
    toast.success("Poste ajouté");
  }

  function handleRemove(name: string) {
    removePoste(name);
    toast.success("Poste supprimé de la liste");
  }

  return (
    <div className="space-y-6">
      <Link
        href="/employes"
        className="inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-[#1F3F73]"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux employés
      </Link>

      <div>
        <h1 className="font-display text-[28px] font-bold tracking-tight text-slate-900">
          Référentiel des postes
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Créez les intitulés de poste utilisés lors de l&apos;ajout d&apos;employés. Seul le
          service RH gère cette liste et la création des comptes.
        </p>
      </div>

      <GlassCard className="p-5">
        <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Nouveau poste" className="flex-1">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex. Responsable logistique"
            />
          </Field>
          <Button type="submit" variant="primary" icon={<Plus className="h-4 w-4" />}>
            Ajouter
          </Button>
        </form>
      </GlassCard>

      <GlassCard className="p-0 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3">
          <p className="text-sm font-semibold text-slate-900">
            {postes.length} poste(s) disponible(s)
          </p>
        </div>
        {postes.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            Aucun poste. Ajoutez le premier ci-dessus.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {postes.map((poste) => (
              <li
                key={poste}
                className="flex items-center justify-between gap-3 px-5 py-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#E8F0FA] text-[#2F5F9D]">
                    <Briefcase className="h-4 w-4" />
                  </span>
                  <span className="truncate font-medium text-slate-900">{poste}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(poste)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Supprimer ${poste}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
