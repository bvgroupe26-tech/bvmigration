"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calculator } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import PaieGenerateResultModal from "@/components/paie/PaieGenerateResultModal";
import {apiClient, getUserErrorMessage } from "@/lib/fetcher";
import { normalizeGeneratePaieResult, type GeneratePaieResult } from "@/lib/paie-utils";
import { useEmployes } from "@/hooks/api";

const MOIS_NOMS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

export default function PaieGenerationPage() {
  const router = useRouter();
  const now = new Date();
  const [mois, setMois] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [annee, setAnnee] = useState(now.getFullYear());
  const [selectedEmployeId, setSelectedEmployeId] = useState<number | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GeneratePaieResult | null>(null);
  const [resultOpen, setResultOpen] = useState(false);

  const { employes } = useEmployes({ statut: "actif", limit: 500 });
  const selectedEmploye = employes.find((e) => e.id === selectedEmployeId);
  const periodeLabel = `${MOIS_NOMS[parseInt(mois, 10) - 1]} ${annee}`;

  async function go() {
    setBusy(true);
    try {
      const raw = await apiClient.post<unknown>("/paie", {
        mois,
        annee,
        employe_id: selectedEmployeId,
      });
      const res = normalizeGeneratePaieResult(raw);
      setResult(res);
      setResultOpen(true);
      if (res.generated > 0) {
        toast.success(`${res.generated} bulletin(s) généré(s) · ${res.skipped} ignoré(s)`);
      } else if (res.skipped > 0) {
        toast.info(`Aucun nouveau bulletin : ${res.skipped} ignoré(s) pour ${periodeLabel}`);
      } else {
        toast.info("Aucun bulletin éligible pour cette période.");
      }
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Link href="/paie" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>
      <div>
        <h1 className="font-display text-[28px] font-bold tracking-tight text-slate-900">Générer la paie</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Création automatique pour les employés éligibles (statut, embauche, fin de contrat, salaire).
        </p>
      </div>

      <GlassCard className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Mois</label>
            <select value={mois} onChange={(e) => setMois(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900">
              {MOIS_NOMS.map((m, i) => (
                <option key={i} value={String(i + 1).padStart(2, "0")}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Année</label>
            <input
              type="number"
              value={annee}
              onChange={(e) => setAnnee(Number(e.target.value))}
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Employé</label>
            <select
              value={selectedEmployeId ?? ""}
              onChange={(e) => setSelectedEmployeId(e.target.value ? Number(e.target.value) : undefined)}
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
            >
              <option value="">Tous les employés</option>
              {employes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.prenom} {e.nom}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
          Les montants de chaque bulletin reprennent exclusivement la fiche employé : salaire de base, indemnités
          (transport, logement, etc.) et taux CNSS / impôt éventuels que vous avez saisis. Aucun forfait n&apos;est
          appliqué par l&apos;application. Complétez ou corrigez chaque bulletin après génération si besoin. Les
          périodes déjà générées sont ignorées.
        </p>
        <div className="mt-5 flex justify-end">
          <Button variant="primary" icon={<Calculator className="h-4 w-4" />} onClick={go} loading={busy}>
            Générer la paie {MOIS_NOMS[parseInt(mois, 10) - 1]} {annee}
          </Button>
        </div>
      </GlassCard>

      <PaieGenerateResultModal
        open={resultOpen}
        onClose={() => {
          setResultOpen(false);
          router.push("/paie");
        }}
        result={result}
        periodeLabel={periodeLabel}
      />
    </div>
  );
}
