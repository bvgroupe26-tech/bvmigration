"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, ListOrdered, SlidersHorizontal, Table2, UserCog, Lock } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import PaieSettingsBanner from "@/components/paie/PaieSettingsBanner";
import EmployeurTab from "@/components/paie/settings/EmployeurTab";
import RubriquesTab from "@/components/paie/settings/RubriquesTab";
import ParametresTab from "@/components/paie/settings/ParametresTab";
import BaremesTab from "@/components/paie/settings/BaremesTab";
import ElementsFixesTab from "@/components/paie/settings/ElementsFixesTab";
import { useAuth } from "@/context/AuthContext";
import { usePaieSettingsStatut } from "@/hooks/paie";
import { normalizeAppRole } from "@/lib/session";
import { cn } from "@/lib/utils";

type Tab = "employeur" | "rubriques" | "parametres" | "baremes" | "elements";

const TABS: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "employeur", label: "Employeur", icon: Building2 },
  { id: "rubriques", label: "Rubriques", icon: ListOrdered },
  { id: "parametres", label: "Paramètres", icon: SlidersHorizontal },
  { id: "baremes", label: "Barèmes", icon: Table2 },
  { id: "elements", label: "Éléments fixes", icon: UserCog },
];

export default function ParametresPaiePage() {
  const { user } = useAuth();
  const role = normalizeAppRole(user?.role);
  const canRead = role === "admin" || role === "rh";
  const canWrite = role === "admin";
  const [tab, setTab] = useState<Tab>("employeur");
  const { statut, mutate: mutateStatut } = usePaieSettingsStatut();

  if (!canRead) {
    return (
      <GlassCard className="p-12 text-center">
        <Lock className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-3 text-sm text-text-secondary">Le paramétrage de la paie est réservé aux administrateurs et aux RH.</p>
      </GlassCard>
    );
  }

  const onSaved = () => void mutateStatut();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/paie" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Retour à la paie
        </Link>
        <h1 className="mt-3 font-display text-[28px] font-bold tracking-tight text-slate-900">Paramètres de paie</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Fiche employeur, plan de paie (rubriques), taux et plafonds datés, barèmes d&apos;impôt et éléments fixes par
          salarié. Les taux légaux sont à saisir et à faire valider par votre comptable.
          {!canWrite && " Consultation seule : seul un administrateur peut modifier ces paramètres."}
        </p>
      </div>

      <PaieSettingsBanner statut={statut} />

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-sm">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 font-medium transition",
                tab === t.id ? "bg-[#1F3F73] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "employeur" && <EmployeurTab canWrite={canWrite} onSaved={onSaved} />}
      {tab === "rubriques" && <RubriquesTab canWrite={canWrite} onSaved={onSaved} />}
      {tab === "parametres" && <ParametresTab canWrite={canWrite} onSaved={onSaved} />}
      {tab === "baremes" && <BaremesTab canWrite={canWrite} onSaved={onSaved} />}
      {tab === "elements" && <ElementsFixesTab canWrite={canWrite} />}
    </div>
  );
}
