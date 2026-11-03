"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import StatBadge from "@/components/ui/StatBadge";
import { Field, NativeSelect, Input } from "@/components/ui/Field";
import { usePayrollPeriods, paieActions } from "@/hooks/paie";
import { getUserErrorMessage } from "@/lib/fetcher";
import {
  MOIS_NOMS,
  PERIODE_STATUT_LABELS,
  formatFcfa,
  periodeLabel,
  periodeStatutBadge,
  normalizePeriod,
} from "@/lib/types-paie";

type Props = {
  disabled: boolean;
};

export default function PeriodesTab({ disabled }: Props) {
  const router = useRouter();
  const { periodes, isLoading, error, mutate } = usePayrollPeriods();
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [annee, setAnnee] = useState(now.getFullYear());
  const [saving, setSaving] = useState(false);

  async function create() {
    setSaving(true);
    try {
      const created = normalizePeriod(await paieActions.createPeriode(annee, mois));
      toast.success(`Période ${periodeLabel(mois, annee)} créée`);
      setOpen(false);
      await mutate();
      if (created.id) router.push(`/paie/periodes/${created.id}`);
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const sorted = [...periodes].sort((a, b) => b.annee - a.annee || b.mois - a.mois);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-text-secondary">
          Chaque mois de paie suit les étapes Ouverte → Calculée → Validée → Payée → Clôturée. Une période clôturée ne
          peut plus être modifiée ; les corrections passent par un rappel ou un contre-bulletin.
        </p>
        <Button
          variant="primary"
          icon={<CalendarPlus className="h-4 w-4" />}
          onClick={() => setOpen(true)}
          disabled={disabled}
          title={disabled ? "Paramétrage incomplet" : undefined}
        >
          Nouvelle période
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <GlassCard className="p-6 text-sm text-text-secondary">
          Impossible de charger les périodes de paie. {getUserErrorMessage(error)}
        </GlassCard>
      ) : sorted.length === 0 ? (
        <GlassCard className="p-10 text-center text-sm text-text-secondary">
          Aucune période de paie. Créez la première période pour saisir les variables et calculer les bulletins.
        </GlassCard>
      ) : (
        <GlassCard className="divide-y divide-slate-100 p-0">
          {sorted.map((p) => (
            <Link
              key={p.id}
              href={`/paie/periodes/${p.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="font-display text-base font-semibold text-slate-900">{periodeLabel(p.mois, p.annee)}</p>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {p.nbBulletins} bulletin(s)
                  {p.compteurs ? ` · net ${formatFcfa(p.compteurs.masseNette)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatBadge variant={periodeStatutBadge(p.statut)}>{PERIODE_STATUT_LABELS[p.statut]}</StatBadge>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            </Link>
          ))}
        </GlassCard>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Ouvrir une période de paie" size="sm">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mois">
              <NativeSelect value={mois} onChange={(e) => setMois(Number(e.target.value))}>
                {MOIS_NOMS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Année">
              <Input type="number" value={annee} onChange={(e) => setAnnee(Number(e.target.value))} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button variant="primary" onClick={create} loading={saving}>
              Créer la période
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
