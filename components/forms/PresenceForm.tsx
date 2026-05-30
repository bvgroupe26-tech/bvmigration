"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { presenceSchema, type PresenceInput } from "@/lib/schemas";
import {apiClient, getUserErrorMessage } from "@/lib/fetcher";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { useEmployes } from "@/hooks/api";
import type { Presence } from "@/lib/types";

type Props = {
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultDate?: string;
};

export default function PresenceForm({ onSuccess, onCancel, defaultDate }: Props) {
  const { employes } = useEmployes({ statut: "actif" });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PresenceInput>({
    resolver: zodResolver(presenceSchema) as unknown as Resolver<PresenceInput>,
    defaultValues: {
      employe_id: 0,
      date: defaultDate ?? new Date().toISOString().slice(0, 10),
      heure_entree: "08:00",
      heure_sortie: "17:30",
      statut: "present",
      justification: "",
      heures_supplementaires: 0,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await apiClient.post<Presence>("/presences", data);
      toast.success("Présence enregistrée");
      onSuccess?.();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Employé" required error={errors.employe_id?.message}>
        <NativeSelect {...register("employe_id")} defaultValue="">
          <option value="" disabled>
            Sélectionner un employé
          </option>
          {employes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.prenom} {e.nom} — {e.poste}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Date" required error={errors.date?.message}>
          <Input type="date" {...register("date")} />
        </Field>
        <Field label="Statut" required>
          <NativeSelect {...register("statut")}>
            <option value="present">Présent</option>
            <option value="retard">Retard</option>
            <option value="absent">Absent</option>
            <option value="conge">Congé</option>
            <option value="mission">Mission</option>
          </NativeSelect>
        </Field>
        <Field label="Heure d'entrée">
          <Input type="time" {...register("heure_entree")} />
        </Field>
        <Field label="Heure de sortie">
          <Input type="time" {...register("heure_sortie")} />
        </Field>
        <Field label="Heures supplémentaires" className="sm:col-span-2">
          <Input type="number" min={0} step={0.5} {...register("heures_supplementaires")} />
        </Field>
      </div>
      <Field label="Justification (si retard ou absence)">
        <Textarea placeholder="Optionnel" {...register("justification")} />
      </Field>
      <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Annuler
          </Button>
        )}
        <Button type="submit" variant="primary" loading={isSubmitting}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
