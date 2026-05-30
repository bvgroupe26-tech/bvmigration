"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { candidatureSchema, type CandidatureInput } from "@/lib/schemas";
import {apiClient, getUserErrorMessage } from "@/lib/fetcher";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";

export default function NouvelleCandidaturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CandidatureInput>({
    resolver: zodResolver(candidatureSchema) as unknown as Resolver<CandidatureInput>,
    defaultValues: { offre_id: Number(id), nom: "", prenom: "", email: "", telephone: "", lettre_motivation: "", statut: "recu" },
  });

  const submit = handleSubmit(async (data) => {
    try {
      await apiClient.post("/candidatures", data);
      toast.success("Candidature enregistrée");
      router.push(`/recrutement/${id}`);
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    }
  });

  return (
    <div className="space-y-5">
      <Link href={`/recrutement/${id}`} className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Retour à l&apos;offre
      </Link>
      <div>
        <h1 className="font-display text-[28px] font-bold tracking-tight text-slate-900">Ajouter un candidat</h1>
        <p className="mt-1 text-sm text-text-secondary">Saisissez les informations du candidat.</p>
      </div>

      <GlassCard className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <input type="hidden" {...register("offre_id")} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Prénom" required error={errors.prenom?.message}>
              <Input placeholder="Marie" {...register("prenom")} />
            </Field>
            <Field label="Nom" required error={errors.nom?.message}>
              <Input placeholder="Mboungou" {...register("nom")} />
            </Field>
            <Field label="Email" required error={errors.email?.message}>
              <Input type="email" placeholder="marie@example.com" {...register("email")} />
            </Field>
            <Field label="Téléphone" required error={errors.telephone?.message}>
              <Input placeholder="+241 06 ..." {...register("telephone")} />
            </Field>
          </div>
          <Field label="Lettre de motivation" required error={errors.lettre_motivation?.message}>
            <Textarea rows={5} placeholder="Parcours, motivation, disponibilités (min. 30 caractères)" {...register("lettre_motivation")} />
          </Field>
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="ghost" onClick={() => router.push(`/recrutement/${id}`)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Enregistrer
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
