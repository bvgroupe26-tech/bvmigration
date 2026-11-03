"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarRange, History } from "lucide-react";
import PaieSettingsBanner from "@/components/paie/PaieSettingsBanner";
import PeriodesTab from "@/components/paie/PeriodesTab";
import LegacyPaieTab from "@/components/paie/LegacyPaieTab";
import Skeleton from "@/components/ui/Skeleton";
import { usePaieSettingsStatut } from "@/hooks/paie";
import { cn } from "@/lib/utils";

type Tab = "periodes" | "legacy";

export default function PaiePage() {
  const { statut, isLoading, error } = usePaieSettingsStatut();
  const pret = Boolean(statut?.pret);
  const [tab, setTab] = useState<Tab | null>(null);
  const activeTab: Tab = tab ?? (pret ? "periodes" : "legacy");

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="font-display text-[28px] font-bold tracking-tight text-slate-900">Gestion de la paie</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Périodes de paie, variables du mois, bulletins par rubriques et téléchargement PDF.
        </p>
      </motion.div>

      {isLoading ? <Skeleton className="h-20 w-full" /> : <PaieSettingsBanner statut={statut} unavailable={Boolean(error)} />}

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-sm sm:inline-flex">
        <TabButton active={activeTab === "periodes"} onClick={() => setTab("periodes")} icon={<CalendarRange className="h-4 w-4" />}>
          Périodes de paie
        </TabButton>
        <TabButton active={activeTab === "legacy"} onClick={() => setTab("legacy")} icon={<History className="h-4 w-4" />}>
          Bulletins (ancien calcul)
        </TabButton>
      </div>

      {activeTab === "periodes" ? <PeriodesTab disabled={!pret} /> : <LegacyPaieTab />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 font-medium transition sm:flex-none",
        active ? "bg-[#1F3F73] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
