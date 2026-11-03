"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, XCircle, Printer, Pencil, X, FileDown, Undo2 } from "lucide-react";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import Skeleton from "@/components/ui/Skeleton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Field, Input } from "@/components/ui/Field";
import BulletinPaieSheet from "@/components/paie/BulletinPaieSheet";
import BulletinLignesSheet from "@/components/paie/BulletinLignesSheet";
import { useBulletin, downloadBulletinPdf, paieActions } from "@/hooks/paie";
import { apiClient, getUserErrorMessage } from "@/lib/fetcher";
import { refreshNotificationsCache } from "@/hooks/useNotifications";
import { paieMontantsFormSchema, type PaieMontantsFormInput } from "@/lib/schemas";
import { normalizeBulletinDetail } from "@/lib/types-paie";

type LegacyAction = "paye" | "annule" | null;

const MONTANT_FIELDS: Array<{ name: keyof PaieMontantsFormInput; label: string }> = [
  { name: "salaire_base", label: "Salaire de base" },
  { name: "prime_transport", label: "Prime transport" },
  { name: "prime_logement", label: "Prime logement" },
  { name: "prime_performance", label: "Prime performance" },
  { name: "autres_primes", label: "Autres primes" },
  { name: "cnss", label: "CNSS" },
  { name: "impot", label: "Impôt sur le revenu" },
  { name: "autres_retenues", label: "Autres retenues" },
];

export default function BulletinDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { bulletin, isLoading, error, mutate } = useBulletin(id);
  const [editing, setEditing] = useState(false);
  const [pendingStatut, setPendingStatut] = useState<LegacyAction>(null);
  const [confirmContre, setConfirmContre] = useState(false);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaieMontantsFormInput>({
    resolver: zodResolver(paieMontantsFormSchema) as unknown as Resolver<PaieMontantsFormInput>,
  });

  useEffect(() => {
    if (!bulletin || bulletin.moteur !== "legacy") return;
    const l = bulletin.legacy;
    reset({
      salaire_base: l.salaire_base,
      prime_transport: l.prime_transport,
      prime_logement: l.prime_logement,
      prime_performance: l.prime_performance,
      autres_primes: l.autres_primes,
      cnss: l.cnss,
      impot: l.impot,
      autres_retenues: l.autres_retenues,
    });
  }, [bulletin, reset]);

  async function changeStatut(statut: "paye" | "annule") {
    setBusy(true);
    try {
      await apiClient.put(`/paie/${id}`, { statut });
      toast.success(`Bulletin ${statut === "paye" ? "marqué payé" : "annulé"}`);
      setPendingStatut(null);
      await mutate();
      void refreshNotificationsCache();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function contreBulletin() {
    setBusy(true);
    try {
      const created = normalizeBulletinDetail(await paieActions.contreBulletin(Number(id)));
      toast.success("Contre-bulletin créé");
      setConfirmContre(false);
      if (created.id) router.push(`/paie/${created.id}`);
      else await mutate();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf() {
    if (!bulletin) return;
    setDownloading(true);
    try {
      await downloadBulletinPdf(bulletin.id, bulletin.numero);
    } catch (err) {
      toast.error(getUserErrorMessage(err, "Impossible de télécharger le PDF."));
    } finally {
      setDownloading(false);
    }
  }

  const saveMontants = handleSubmit(async (data) => {
    try {
      await apiClient.put(`/paie/${id}`, data);
      toast.success("Bulletin mis à jour");
      await mutate();
      setEditing(false);
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    }
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!bulletin) {
    return (
      <GlassCard className="p-12 text-center">
        <p className="text-text-secondary">{error ? getUserErrorMessage(error) : "Bulletin introuvable"}</p>
        <Link href="/paie" className="mt-4 inline-block text-sm font-medium text-[#2F5F9D] hover:text-[#1F3F73]">
          ← Retour
        </Link>
      </GlassCard>
    );
  }

  const isLegacy = bulletin.moteur === "legacy";
  const canContre =
    !isLegacy && bulletin.type !== "contre_bulletin" && (bulletin.statut === "valide" || bulletin.statut === "paye");
  const backHref = bulletin.periodId ? `/paie/periodes/${bulletin.periodId}` : "/paie";

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="no-print flex flex-wrap items-center justify-between gap-3"
      >
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {isLegacy && bulletin.statut === "en_attente" && !editing && (
            <>
              <Button variant="ghost" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(true)}>
                Modifier les montants
              </Button>
              <Button variant="success" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setPendingStatut("paye")}>
                Marquer payé
              </Button>
              <Button variant="danger" icon={<XCircle className="h-4 w-4" />} onClick={() => setPendingStatut("annule")}>
                Annuler le bulletin
              </Button>
            </>
          )}
          {editing && (
            <>
              <Button type="button" variant="ghost" icon={<X className="h-4 w-4" />} onClick={() => setEditing(false)}>
                Fermer
              </Button>
              <Button type="submit" form="form-paie-montants" variant="primary" loading={isSubmitting}>
                Enregistrer
              </Button>
            </>
          )}
          {canContre && (
            <Button variant="danger" icon={<Undo2 className="h-4 w-4" />} onClick={() => setConfirmContre(true)}>
              Contre-bulletin
            </Button>
          )}
          {!editing && (
            <>
              <Button variant="primary" icon={<FileDown className="h-4 w-4" />} onClick={downloadPdf} loading={downloading}>
                Télécharger le PDF
              </Button>
              <Button variant="ghost" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
                Imprimer
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {bulletin.annuleBulletinId && (
        <div className="no-print rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Ce bulletin annule le{" "}
          <Link href={`/paie/${bulletin.annuleBulletinId}`} className="font-semibold underline">
            bulletin d&apos;origine
          </Link>
          .
        </div>
      )}

      {editing && isLegacy && (
        <GlassCard className="no-print p-6">
          <h2 className="text-sm font-semibold text-slate-900">Saisie des montants (FCFA)</h2>
          <p className="mt-1 text-xs text-text-secondary">Le net est recalculé par le serveur à l&apos;enregistrement.</p>
          <form id="form-paie-montants" onSubmit={saveMontants} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MONTANT_FIELDS.map((f) => (
              <Field key={f.name} label={f.label} error={errors[f.name]?.message}>
                <Input type="number" inputMode="numeric" min={0} step="1" placeholder="0" {...register(f.name)} />
              </Field>
            ))}
          </form>
        </GlassCard>
      )}

      {isLegacy ? (
        <BulletinPaieSheet
          bulletin={bulletin.legacy}
          matricule={bulletin.employe.matricule}
          employeurNom={bulletin.employeur?.raisonSociale}
        />
      ) : (
        <BulletinLignesSheet bulletin={bulletin} />
      )}

      <ConfirmDialog
        open={pendingStatut !== null}
        onClose={() => setPendingStatut(null)}
        onConfirm={() => (pendingStatut ? changeStatut(pendingStatut) : undefined)}
        loading={busy}
        variant={pendingStatut === "annule" ? "danger" : "warning"}
        title={pendingStatut === "paye" ? "Marquer ce bulletin comme payé ?" : "Annuler ce bulletin ?"}
        description={
          pendingStatut === "paye"
            ? "L'employé sera notifié et le bulletin deviendra visible dans son espace. Ses montants ne pourront plus être modifiés."
            : "Le bulletin sera exclu de la masse salariale."
        }
        confirmLabel={pendingStatut === "paye" ? "Marquer payé" : "Annuler le bulletin"}
        cancelLabel="Retour"
      />

      <ConfirmDialog
        open={confirmContre}
        onClose={() => setConfirmContre(false)}
        onConfirm={contreBulletin}
        loading={busy}
        variant="danger"
        title="Émettre un contre-bulletin ?"
        description="Un bulletin inverse (montants négatifs) est créé pour annuler celui-ci. Le bulletin d'origine reste archivé. Établissez ensuite un rappel si un nouveau montant est dû."
        confirmLabel="Créer le contre-bulletin"
        cancelLabel="Retour"
      />
    </div>
  );
}
