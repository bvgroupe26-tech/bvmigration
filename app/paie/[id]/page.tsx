"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, XCircle, Printer, Pencil, X } from "lucide-react";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import Skeleton from "@/components/ui/Skeleton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Field, Input } from "@/components/ui/Field";
import BulletinPaieSheet from "@/components/paie/BulletinPaieSheet";
import { usePaieDetail } from "@/hooks/api";
import {apiClient, getUserErrorMessage } from "@/lib/fetcher";
import { refreshNotificationsCache } from "@/hooks/useNotifications";
import { paieMontantsFormSchema, type PaieMontantsFormInput } from "@/lib/schemas";
import { calcSalaireNet } from "@/lib/paie-calc";
import type { Paie } from "@/lib/types";

export default function BulletinDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { bulletin, isLoading, mutate } = usePaieDetail(id);
  const [editing, setEditing] = useState(false);
  const [pendingStatut, setPendingStatut] = useState<"paye" | "annule" | null>(null);
  const [changingStatut, setChangingStatut] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PaieMontantsFormInput>({
    resolver: zodResolver(paieMontantsFormSchema) as unknown as Resolver<PaieMontantsFormInput>,
    defaultValues: {
      salaire_base: 0,
      prime_transport: 0,
      prime_logement: 0,
      prime_performance: 0,
      autres_primes: 0,
      cnss: 0,
      impot: 0,
      autres_retenues: 0,
    },
  });

  useEffect(() => {
    if (!bulletin) return;
    reset({
      salaire_base: bulletin.salaire_base,
      prime_transport: bulletin.prime_transport,
      prime_logement: bulletin.prime_logement,
      prime_performance: bulletin.prime_performance,
      autres_primes: bulletin.autres_primes,
      cnss: bulletin.cnss,
      impot: bulletin.impot,
      autres_retenues: bulletin.autres_retenues,
    });
  }, [bulletin, reset]);

  const w = watch();
  const previewNet = calcSalaireNet({
    salaire_base: Number(w.salaire_base) || 0,
    prime_transport: Number(w.prime_transport) || 0,
    prime_logement: Number(w.prime_logement) || 0,
    prime_performance: Number(w.prime_performance) || 0,
    autres_primes: Number(w.autres_primes) || 0,
    cnss: Number(w.cnss) || 0,
    impot: Number(w.impot) || 0,
    autres_retenues: Number(w.autres_retenues) || 0,
  });

  async function changeStatut(statut: "paye" | "annule") {
    setChangingStatut(true);
    try {
      await apiClient.put(`/paie/${id}`, { statut });
      toast.success(`Bulletin ${statut === "paye" ? "marqué payé" : "annulé"}`);
      setPendingStatut(null);
      mutate();
      void refreshNotificationsCache();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setChangingStatut(false);
    }
  }

  const saveMontants = handleSubmit(async (data) => {
    try {
      await apiClient.put<Paie>(`/paie/${id}`, data);
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
        <p className="text-text-secondary">Bulletin introuvable</p>
        <Link href="/paie" className="mt-4 inline-block text-sm font-medium text-[#2F5F9D] hover:text-[#1F3F73]">
          ← Retour
        </Link>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="no-print flex flex-wrap items-center justify-between gap-3"
      >
        <Link href="/paie" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {bulletin.statut === "en_attente" && !editing && (
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
          {!editing && (
            <Button variant="ghost" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
              Imprimer
            </Button>
          )}
        </div>
      </motion.div>

      {editing && (
        <GlassCard className="no-print p-6">
          <h2 className="text-sm font-semibold text-slate-900">Saisie des montants (FCFA)</h2>
          <p className="mt-1 text-xs text-text-secondary">
            Ajustez chaque ligne ; le net est recalculé côté serveur à l&apos;enregistrement.
          </p>
          <form id="form-paie-montants" onSubmit={saveMontants} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Salaire de base" error={errors.salaire_base?.message}>
              <Input type="number" inputMode="numeric" min={0} step="any" placeholder="0" {...register("salaire_base")} />
            </Field>
            <Field label="Prime transport" error={errors.prime_transport?.message}>
              <Input type="number" inputMode="numeric" min={0} step="any" placeholder="0" {...register("prime_transport")} />
            </Field>
            <Field label="Prime logement" error={errors.prime_logement?.message}>
              <Input type="number" inputMode="numeric" min={0} step="any" placeholder="0" {...register("prime_logement")} />
            </Field>
            <Field label="Prime performance" error={errors.prime_performance?.message}>
              <Input type="number" inputMode="numeric" min={0} step="any" placeholder="0" {...register("prime_performance")} />
            </Field>
            <Field label="Autres primes" error={errors.autres_primes?.message}>
              <Input type="number" inputMode="numeric" min={0} step="any" placeholder="0" {...register("autres_primes")} />
            </Field>
            <Field label="CNSS" error={errors.cnss?.message}>
              <Input type="number" inputMode="numeric" min={0} step="any" placeholder="0" {...register("cnss")} />
            </Field>
            <Field label="Impôt sur le revenu" error={errors.impot?.message}>
              <Input type="number" inputMode="numeric" min={0} step="any" placeholder="0" {...register("impot")} />
            </Field>
            <Field label="Autres retenues" error={errors.autres_retenues?.message}>
              <Input type="number" inputMode="numeric" min={0} step="any" placeholder="0" {...register("autres_retenues")} />
            </Field>
            <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Net estimé (aperçu) :{" "}
              <span className="font-mono font-semibold text-slate-900">{previewNet.toLocaleString("fr-FR")} F CFA</span>
            </div>
          </form>
        </GlassCard>
      )}

      <BulletinPaieSheet bulletin={bulletin} />

      <ConfirmDialog
        open={pendingStatut !== null}
        onClose={() => setPendingStatut(null)}
        onConfirm={() => (pendingStatut ? changeStatut(pendingStatut) : undefined)}
        loading={changingStatut}
        variant={pendingStatut === "annule" ? "danger" : "warning"}
        title={pendingStatut === "paye" ? "Marquer ce bulletin comme payé ?" : "Annuler ce bulletin ?"}
        description={
          pendingStatut === "paye"
            ? "L'employé sera notifié et le bulletin deviendra visible dans son espace. Ses montants ne pourront plus être modifiés."
            : "Le bulletin sera exclu de la masse salariale. Cette action ne se fait pas depuis un bulletin déjà payé, sauf par un administrateur."
        }
        confirmLabel={pendingStatut === "paye" ? "Marquer payé" : "Annuler le bulletin"}
        cancelLabel="Retour"
      />
    </div>
  );
}
