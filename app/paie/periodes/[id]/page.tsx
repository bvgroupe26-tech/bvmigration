"use client";

import { use, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Calculator, CheckCircle2, Banknote, Lock, RefreshCcw, UserRound } from "lucide-react";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import StatBadge from "@/components/ui/StatBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Field, Input, NativeSelect } from "@/components/ui/Field";
import PeriodeStepper from "@/components/paie/PeriodeStepper";
import PeriodeVariablesTab from "@/components/paie/PeriodeVariablesTab";
import PeriodeBulletinsTab, { type BulletinRowAction } from "@/components/paie/PeriodeBulletinsTab";
import PaieSettingsBanner from "@/components/paie/PaieSettingsBanner";
import { usePayrollPeriod, usePaieSettingsStatut, paieActions } from "@/hooks/paie";
import { useEmployes } from "@/hooks/api";
import { getUserErrorMessage } from "@/lib/fetcher";
import { localDateISO } from "@/lib/date-local";
import {
  MODE_PAIEMENT_LABELS,
  PERIODE_STATUT_LABELS,
  periodeLabel,
  periodeStatutBadge,
  type ModePaiement,
} from "@/lib/types-paie";
import { cn } from "@/lib/utils";

type Tab = "variables" | "bulletins";
type ConfirmAction = "calculer" | "valider" | "cloturer" | null;

const CONFIRM_TEXT: Record<Exclude<ConfirmAction, null>, { title: string; description: string; label: string }> = {
  calculer: {
    title: "Calculer les bulletins de la période ?",
    description:
      "Les bulletins non validés sont recalculés à partir des rubriques, des éléments fixes de chaque employé et des variables saisies.",
    label: "Calculer",
  },
  valider: {
    title: "Valider la période ?",
    description:
      "Les bulletins sont figés (numéro, données employeur et salarié). Ils ne pourront plus être modifiés : toute correction passera par un rappel ou un contre-bulletin.",
    label: "Valider",
  },
  cloturer: {
    title: "Clôturer la période ?",
    description: "Une période clôturée n'accepte plus aucune écriture. Cette action est définitive.",
    label: "Clôturer",
  },
};

export default function PeriodeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = use(params);
  const id = Number(idParam);
  const { periode, isLoading, error, mutate } = usePayrollPeriod(Number.isFinite(id) && id > 0 ? id : null);
  const { statut: settings } = usePaieSettingsStatut();
  const [tab, setTab] = useState<Tab>("bulletins");
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [datePaiement, setDatePaiement] = useState(localDateISO());
  const [modePaiement, setModePaiement] = useState<ModePaiement | "">("");
  const [busy, setBusy] = useState(false);
  // Employé ciblé (un seul bulletin) pour calculer / valider / payer ; undefined = toute la période.
  const [scope, setScope] = useState<{ employeId: number; nom: string } | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [pickedId, setPickedId] = useState("");
  const { employes } = useEmployes({ statut: "actif" });

  async function run(action: "calculer" | "valider" | "payer" | "cloturer", body?: unknown) {
    setBusy(true);
    try {
      const res = (await paieActions.periodeAction(id, action, body)) as Record<string, unknown> | null;
      const count = (k: string) => (Array.isArray(res?.[k]) ? (res![k] as unknown[]).length : 0);
      const messages = {
        calculer: `Bulletins calculés : ${Number(res?.calcules ?? 0)}`,
        valider: `Bulletins validés : ${Number(res?.valides ?? 0)}`,
        payer: `Bulletins payés : ${Number(res?.payes ?? 0)}`,
        cloturer: "Période clôturée",
      };
      toast.success(messages[action]);
      if (count("ignores") > 0) {
        const ignores = res!.ignores as Array<{ nom?: string; raison?: string }>;
        // Pour un seul employé, la raison est l'information utile (non éligible, déjà validé…).
        toast.warning(
          scope || ignores.length <= 3
            ? `Non calculé : ${ignores.map((i) => `${i.nom} (${i.raison})`).join(" ; ")}`
            : `${ignores.length} employé(s) ignoré(s) (non éligibles ou déjà validés).`
        );
      }
      if (count("erreurs") > 0) {
        const erreurs = res!.erreurs as Array<{ nom?: string; message?: string }>;
        toast.error(`${erreurs.length} bulletin(s) en erreur : ${erreurs.map((e) => `${e.nom} (${e.message})`).join(" ; ")}`);
      }
      if (count("ignoresAutoValidation") > 0) {
        toast.warning(
          `${count("ignoresAutoValidation")} bulletin(s) vous concernant non validé(s) : un autre membre RH ou administrateur doit les valider.`
        );
      }
      if (count("archivageEchoue") > 0) {
        toast.warning(`${count("archivageEchoue")} PDF non archivé(s) : vérifier la configuration du stockage.`);
      }
      setConfirm(null);
      setPayOpen(false);
      setPickOpen(false);
      setScope(null);
      await mutate();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  /** Corps de la requête : cible un employé si une sélection est active. */
  const withScope = (body?: Record<string, unknown>) => (scope ? { ...body, employeIds: [scope.employeId] } : body);

  function handleRowAction(action: BulletinRowAction, row: { employeId: number; employePrenom: string; employeNom: string }) {
    setScope({ employeId: row.employeId, nom: `${row.employePrenom} ${row.employeNom}`.trim() });
    if (action === "payer") setPayOpen(true);
    else if (action === "valider") setConfirm("valider");
    else void run("calculer", { employeIds: [row.employeId] });
  }

  function closeDialogs() {
    setConfirm(null);
    setPayOpen(false);
    setPickOpen(false);
    setScope(null);
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !periode) {
    return (
      <GlassCard className="p-12 text-center">
        <p className="text-text-secondary">{error ? getUserErrorMessage(error) : "Période introuvable"}</p>
        <Link href="/paie" className="mt-4 inline-block text-sm font-medium text-[#2F5F9D] hover:text-[#1F3F73]">
          ← Retour à la paie
        </Link>
      </GlassCard>
    );
  }

  const s = periode.statut;
  const moteurPret = Boolean(settings?.pret);
  const variablesEditable = s !== "cloturee";
  const compteurs = periode.compteurs;
  const nbCalcules = compteurs?.calcule ?? 0;
  const nbValides = compteurs?.valide ?? 0;
  const dejaTraites = new Set(
    periode.bulletins.filter((b) => b.type === "normal" && b.statut !== "annule").map((b) => b.employeId)
  );

  return (
    <div className="space-y-5">
      <Link href="/paie" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Retour aux périodes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[26px] font-bold tracking-tight text-slate-900">
              Paie {periodeLabel(periode.mois, periode.annee)}
            </h1>
            <StatBadge variant={periodeStatutBadge(s)}>{PERIODE_STATUT_LABELS[s]}</StatBadge>
          </div>
          {periode.clotureAt && (
            <p className="mt-1 text-xs text-text-tertiary">
              Clôturée le {new Date(periode.clotureAt).toLocaleDateString("fr-FR")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {(s === "ouverte" || s === "calculee") && (
            <Button
              variant={s === "ouverte" ? "primary" : "secondary"}
              icon={s === "ouverte" ? <Calculator className="h-4 w-4" /> : <RefreshCcw className="h-4 w-4" />}
              onClick={() => setConfirm("calculer")}
              disabled={!moteurPret}
              title={!moteurPret ? "Paramétrage incomplet" : undefined}
            >
              {s === "ouverte" ? "Calculer" : "Recalculer"}
            </Button>
          )}
          {s !== "cloturee" && (
            <Button
              variant="secondary"
              icon={<UserRound className="h-4 w-4" />}
              onClick={() => setPickOpen(true)}
              disabled={!moteurPret}
              title={!moteurPret ? "Paramétrage incomplet" : "Calculer le bulletin d'un seul employé"}
            >
              Calculer un employé
            </Button>
          )}
          {nbCalcules > 0 && (
            <Button
              variant="primary"
              icon={<CheckCircle2 className="h-4 w-4" />}
              onClick={() => {
                setScope(null);
                setConfirm("valider");
              }}
            >
              Valider{nbCalcules > 0 ? ` (${nbCalcules})` : ""}
            </Button>
          )}
          {nbValides > 0 && (
            <Button
              variant="success"
              icon={<Banknote className="h-4 w-4" />}
              onClick={() => {
                setScope(null);
                setPayOpen(true);
              }}
            >
              Payer ({nbValides})
            </Button>
          )}
          {s === "payee" && (
            <Button variant="danger" icon={<Lock className="h-4 w-4" />} onClick={() => setConfirm("cloturer")}>
              Clôturer
            </Button>
          )}
        </div>
      </div>

      <GlassCard className="p-5">
        <PeriodeStepper statut={s} />
      </GlassCard>

      {!moteurPret && s !== "cloturee" && s !== "payee" && <PaieSettingsBanner statut={settings} />}

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-sm sm:inline-flex">
        {(["bulletins", "variables"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 font-medium transition sm:flex-none",
              tab === t ? "bg-[#1F3F73] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            {t === "bulletins" ? `Bulletins (${periode.bulletins.length})` : "Variables"}
          </button>
        ))}
      </div>

      {tab === "bulletins" ? (
        <PeriodeBulletinsTab periode={periode} onRowAction={handleRowAction} busy={busy} calculPossible={moteurPret} />
      ) : (
        <PeriodeVariablesTab periodId={periode.id} editable={variablesEditable} onChanged={() => void mutate()} />
      )}

      {confirm && (
        <ConfirmDialog
          open
          onClose={closeDialogs}
          onConfirm={() => run(confirm, confirm === "cloturer" ? undefined : withScope())}
          loading={busy}
          variant={confirm === "cloturer" ? "danger" : "warning"}
          title={scope ? `${CONFIRM_TEXT[confirm].title.replace(" de la période", "").replace(" la période", "")} — ${scope.nom}` : CONFIRM_TEXT[confirm].title}
          description={CONFIRM_TEXT[confirm].description}
          confirmLabel={CONFIRM_TEXT[confirm].label}
          cancelLabel="Retour"
        />
      )}

      <Modal open={pickOpen} onClose={closeDialogs} title="Calculer le bulletin d'un employé" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Seul le bulletin de l&apos;employé choisi est calculé (ou recalculé s&apos;il n&apos;est pas encore validé). Les autres bulletins de la
            période ne changent pas.
          </p>
          <Field label="Employé" required>
            <NativeSelect value={pickedId} onChange={(e) => setPickedId(e.target.value)}>
              <option value="">Choisir un employé…</option>
              {employes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nom} {e.prenom}
                  {dejaTraites.has(e.id) ? " — bulletin existant" : ""}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeDialogs} disabled={busy}>
              Annuler
            </Button>
            <Button
              variant="primary"
              loading={busy}
              disabled={!pickedId}
              onClick={() => {
                const emp = employes.find((e) => String(e.id) === pickedId);
                if (emp) setScope({ employeId: emp.id, nom: `${emp.prenom} ${emp.nom}`.trim() });
                void run("calculer", { employeIds: [Number(pickedId)] });
              }}
            >
              Calculer
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={payOpen} onClose={closeDialogs} title={scope ? `Payer ${scope.nom}` : "Payer les bulletins validés"} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            {scope
              ? "Ce bulletin passe au statut « payé » et devient visible dans l'espace de l'employé."
              : "Tous les bulletins validés passent au statut « payé » et deviennent visibles dans l'espace de chaque employé."}
          </p>
          <Field label="Date de paiement" required>
            <Input type="date" value={datePaiement} onChange={(e) => setDatePaiement(e.target.value)} />
          </Field>
          <Field label="Mode de paiement" hint="Laisser vide pour utiliser le mode défini sur chaque fiche employé.">
            <NativeSelect value={modePaiement} onChange={(e) => setModePaiement(e.target.value as ModePaiement | "")}>
              <option value="">Selon la fiche employé</option>
              {(Object.keys(MODE_PAIEMENT_LABELS) as ModePaiement[]).map((m) => (
                <option key={m} value={m}>
                  {MODE_PAIEMENT_LABELS[m]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeDialogs} disabled={busy}>
              Annuler
            </Button>
            <Button
              variant="success"
              loading={busy}
              disabled={!datePaiement}
              onClick={() => run("payer", withScope({ datePaiement, modePaiement: modePaiement || undefined }))}
            >
              Confirmer le paiement
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
