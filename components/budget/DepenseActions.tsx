"use client";

import { useState } from "react";
import { Ban, Check, CreditCard, Send, X } from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/Field";
import { runDepenseAction, type DepenseAction } from "@/lib/budget-api";
import { MODE_PAIEMENT_LABELS, type DepensePermissions } from "@/lib/budget-depense-utils";
import { getUserErrorMessage } from "@/lib/api-errors";
import { localDateISO } from "@/lib/date-local";
import { formatFCFA } from "@/lib/utils";
import type { DepenseFinance, ModePaiement } from "@/lib/types-finance";

const SELF_HINT = "Vous ne pouvez pas traiter votre propre dépense : un autre valideur doit s'en charger.";

type Props = {
  depense: DepenseFinance;
  perms: DepensePermissions;
  justificatifManquant?: boolean;
  onDone: () => void;
  compact?: boolean;
};

type Confirmable = Extract<DepenseAction, "soumettre" | "valider" | "annuler">;

export default function DepenseActions({ depense, perms, justificatifManquant, onDone, compact }: Props) {
  const [confirm, setConfirm] = useState<Confirmable | null>(null);
  const [showRefus, setShowRefus] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [busy, setBusy] = useState(false);
  const [motif, setMotif] = useState("");
  const [pay, setPay] = useState<{ mode: ModePaiement; reference: string; date: string }>({
    mode: "virement",
    reference: "",
    date: localDateISO(),
  });

  const size = compact ? "sm" : "md";
  const validerLabel = depense.statut === "soumise" && perms.needsN2 ? "Valider (N1)" : "Valider";

  async function run(action: DepenseAction, body?: Parameters<typeof runDepenseAction>[2], success?: string) {
    setBusy(true);
    try {
      await runDepenseAction(depense.id, action, body);
      toast.success(success ?? "Dépense mise à jour");
      onDone();
      return true;
    } catch (e) {
      toast.error(getUserErrorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const confirmTexts: Record<Confirmable, { title: string; description: string; label: string; success: string }> = {
    soumettre: {
      title: "Soumettre la dépense ?",
      description: `« ${depense.libelle} » (${formatFCFA(depense.montant_ttc)}) sera transmise pour validation et ne sera plus modifiable.`,
      label: "Soumettre",
      success: "Dépense soumise pour validation",
    },
    valider: {
      title: perms.needsN2 && depense.statut === "soumise" ? "Valider au niveau 1 ?" : "Valider la dépense ?",
      description:
        perms.needsN2 && depense.statut === "soumise"
          ? `Le montant dépasse le seuil : une validation de niveau 2 (administrateur) sera encore nécessaire.`
          : `« ${depense.libelle} » (${formatFCFA(depense.montant_ttc)}) sera engagée sur l'enveloppe et pourra être payée.`,
      label: "Valider",
      success: "Dépense validée",
    },
    annuler: {
      title: "Annuler la dépense ?",
      description: `« ${depense.libelle} » passera au statut Annulée. Cette action est définitive.`,
      label: "Annuler la dépense",
      success: "Dépense annulée",
    },
  };

  const anyAction =
    perms.canSubmit ||
    perms.canValidate ||
    perms.canRefuse ||
    perms.canPay ||
    perms.canCancel ||
    perms.blockedBySelf.validate ||
    perms.blockedBySelf.pay;
  if (!anyAction) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {perms.canSubmit ? (
        <Button
          type="button"
          size={size}
          variant="primary"
          icon={<Send className="h-4 w-4" />}
          disabled={justificatifManquant}
          title={justificatifManquant ? "Ajoutez la pièce justificative avant de soumettre" : undefined}
          onClick={() => setConfirm("soumettre")}
        >
          Soumettre
        </Button>
      ) : null}

      {perms.canValidate || perms.blockedBySelf.validate ? (
        <Button
          type="button"
          size={size}
          variant="success"
          icon={<Check className="h-4 w-4" />}
          disabled={perms.blockedBySelf.validate}
          title={perms.blockedBySelf.validate ? SELF_HINT : undefined}
          onClick={() => setConfirm("valider")}
        >
          {validerLabel}
        </Button>
      ) : null}

      {perms.canRefuse || perms.blockedBySelf.validate ? (
        <Button
          type="button"
          size={size}
          variant="danger"
          icon={<X className="h-4 w-4" />}
          disabled={perms.blockedBySelf.validate}
          title={perms.blockedBySelf.validate ? SELF_HINT : undefined}
          onClick={() => {
            setMotif("");
            setShowRefus(true);
          }}
        >
          Refuser
        </Button>
      ) : null}

      {perms.canPay || perms.blockedBySelf.pay ? (
        <Button
          type="button"
          size={size}
          variant="primary"
          icon={<CreditCard className="h-4 w-4" />}
          disabled={perms.blockedBySelf.pay}
          title={perms.blockedBySelf.pay ? SELF_HINT : undefined}
          onClick={() => setShowPay(true)}
        >
          Payer
        </Button>
      ) : null}

      {perms.canCancel ? (
        <Button
          type="button"
          size={size}
          variant="ghost"
          icon={<Ban className="h-4 w-4" />}
          onClick={() => setConfirm("annuler")}
        >
          Annuler
        </Button>
      ) : null}

      {confirm ? (
        <ConfirmDialog
          open
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            const ok = await run(confirm, undefined, confirmTexts[confirm].success);
            if (ok) setConfirm(null);
          }}
          title={confirmTexts[confirm].title}
          description={confirmTexts[confirm].description}
          confirmLabel={confirmTexts[confirm].label}
          variant={confirm === "annuler" ? "danger" : "warning"}
          loading={busy}
        />
      ) : null}

      <Modal open={showRefus} onClose={() => setShowRefus(false)} title="Refuser la dépense" size="sm">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const m = motif.trim();
            if (m.length < 3) {
              toast.error("Le motif du refus est obligatoire.");
              return;
            }
            const ok = await run("refuser", { motif: m }, "Dépense refusée");
            if (ok) setShowRefus(false);
          }}
        >
          <p className="text-sm text-slate-600">
            « {depense.libelle} » ({formatFCFA(depense.montant_ttc)}) sera renvoyée au demandeur.
          </p>
          <Field label="Motif du refus" required hint="Visible par le demandeur et conservé dans l'historique">
            <Textarea rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} autoFocus />
          </Field>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowRefus(false)}>
              Retour
            </Button>
            <Button type="submit" variant="danger" loading={busy}>
              Confirmer le refus
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={showPay} onClose={() => setShowPay(false)} title="Enregistrer le paiement" size="sm">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!pay.date) {
              toast.error("La date de paiement est obligatoire.");
              return;
            }
            const ok = await run(
              "payer",
              {
                modePaiement: pay.mode,
                referencePaiement: pay.reference.trim() || undefined,
                datePaiement: pay.date,
              },
              "Paiement enregistré"
            );
            if (ok) setShowPay(false);
          }}
        >
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Montant à payer : <span className="font-mono font-semibold">{formatFCFA(depense.montant_ttc)}</span>
            {depense.fournisseur_nom ? ` à ${depense.fournisseur_nom}` : ""}
          </p>
          <Field label="Mode de paiement" required>
            <NativeSelect
              value={pay.mode}
              onChange={(e) => setPay((p) => ({ ...p, mode: e.target.value as ModePaiement }))}
            >
              {(Object.keys(MODE_PAIEMENT_LABELS) as ModePaiement[]).map((m) => (
                <option key={m} value={m}>
                  {MODE_PAIEMENT_LABELS[m]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field
            label="Référence"
            hint={pay.mode === "mobile_money" ? "N° de transaction" : pay.mode === "cheque" ? "N° de chèque" : "Référence du virement ou du reçu"}
          >
            <Input value={pay.reference} onChange={(e) => setPay((p) => ({ ...p, reference: e.target.value }))} />
          </Field>
          <Field label="Date de paiement" required>
            <Input type="date" value={pay.date} onChange={(e) => setPay((p) => ({ ...p, date: e.target.value }))} />
          </Field>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowPay(false)}>
              Retour
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              Confirmer le paiement
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
