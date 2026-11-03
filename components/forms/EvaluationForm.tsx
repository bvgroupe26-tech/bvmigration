"use client";

import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { evaluationSchema, type EvaluationInput } from "@/lib/schemas";
import {apiClient, getUserErrorMessage } from "@/lib/fetcher";
import { stripEmpty } from "@/lib/rh-normalizers";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { useEmployes } from "@/hooks/api";
import { cn } from "@/lib/utils";

type Props = { onSuccess?: () => void; onCancel?: () => void };

function Slider({
  label,
  name,
  register,
  defaultValue,
}: {
  label: string;
  name: keyof EvaluationInput;
  register: ReturnType<typeof useForm<EvaluationInput>>["register"];
  defaultValue: number;
}) {
  return (
    <Field label={label}>
      <input
        type="range"
        min={0}
        max={10}
        step={0.5}
        defaultValue={defaultValue}
        {...register(name)}
        className="w-full accent-[#2F5F9D]"
      />
    </Field>
  );
}

export default function EvaluationForm({ onSuccess, onCancel }: Props) {
  const { employes } = useEmployes({ statut: "actif" });
  const form = useForm<EvaluationInput>({
    resolver: zodResolver(evaluationSchema) as unknown as Resolver<EvaluationInput>,
    defaultValues: {
      employe_id: 0,
      periode: `T${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`,
      ponctualite: 7,
      qualite_travail: 7,
      travail_equipe: 7,
      initiative: 7,
      commentaire: "",
      evaluateur: "",
    },
  });
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = form;

  const values = useWatch({ control });
  const moyenne =
    (Number(values.ponctualite ?? 0) +
      Number(values.qualite_travail ?? 0) +
      Number(values.travail_equipe ?? 0) +
      Number(values.initiative ?? 0)) / 4;

  const onSubmit = handleSubmit(async (data) => {
    try {
      await apiClient.post("/evaluations", stripEmpty(data));
      toast.success("Évaluation enregistrée");
      onSuccess?.();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Employé" required error={errors.employe_id?.message}>
          <NativeSelect {...register("employe_id")} defaultValue="">
            <option value="" disabled>Sélectionner</option>
            {employes.map((e) => (
              <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Période" required error={errors.periode?.message}>
          <Input placeholder="T1 2026" {...register("periode")} />
        </Field>
        <Field label="Évaluateur" className="sm:col-span-2">
          <Input placeholder="Nom du responsable" {...register("evaluateur")} />
        </Field>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <h3 className="text-sm font-semibold text-slate-900">Critères (0 à 10)</h3>
          <div
            className={cn(
              "rounded-lg px-3 py-1.5 font-mono text-sm font-bold",
              moyenne >= 8
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                : moyenne >= 6
                ? "bg-[#2F5F9D]/15 text-[#2F5F9D]/80 border border-[#2F5F9D]/30"
                : moyenne >= 4
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "bg-red-500/15 text-red-300 border border-red-500/30"
            )}
          >
            Moyenne : {moyenne.toFixed(1)} / 10
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Slider label={`Ponctualité (${values.ponctualite ?? 0})`} name="ponctualite" register={register} defaultValue={7} />
          <Slider label={`Qualité du travail (${values.qualite_travail ?? 0})`} name="qualite_travail" register={register} defaultValue={7} />
          <Slider label={`Travail d'équipe (${values.travail_equipe ?? 0})`} name="travail_equipe" register={register} defaultValue={7} />
          <Slider label={`Initiative (${values.initiative ?? 0})`} name="initiative" register={register} defaultValue={7} />
        </div>
      </div>

      <Field label="Commentaire">
        <Textarea rows={3} placeholder="Synthèse de l'évaluation" {...register("commentaire")} />
      </Field>

      <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-4">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Annuler</Button>}
        <Button type="submit" variant="primary" loading={isSubmitting}>Enregistrer</Button>
      </div>
    </form>
  );
}
