"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { absenceSchema, type AbsenceInput } from "@/lib/schemas";
import {apiClient, getUserErrorMessage } from "@/lib/fetcher";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { useEmployes } from "@/hooks/api";

type Props = {
  onSuccess?: () => void;
  onCancel?: () => void;
};

export default function AbsenceForm({ onSuccess, onCancel }: Props) {
  const { employes } = useEmployes({ statut: "actif" });
  const form = useForm<AbsenceInput>({
    resolver: zodResolver(absenceSchema) as unknown as Resolver<AbsenceInput>,
    defaultValues: {
      employe_id: 0,
      date_debut: new Date().toISOString().slice(0, 10),
      date_fin: new Date().toISOString().slice(0, 10),
      type_absence: "conge_paye",
      justification: "",
      statut: "en_attente",
    },
  });
  const { register, handleSubmit, formState } = form;
  const { errors, isSubmitting } = formState;

  const submit = handleSubmit(async (data) => {
    try {
      await apiClient.post("/absences", {
        employeId: data.employe_id,
        dateDebut: data.date_debut,
        dateFin: data.date_fin,
        typeAbsence: data.type_absence,
        justification: data.justification || undefined,
        statut: data.statut,
      });
      toast.success("Demande d absence enregistree");
      onSuccess?.();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    }
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Employe" required error={errors.employe_id?.message}>
        <NativeSelect {...register("employe_id")} defaultValue="">
          <option value="" disabled>
            Selectionner
          </option>
          {employes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.prenom} {e.nom}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Date debut" required error={errors.date_debut?.message}>
          <Input type="date" {...register("date_debut")} />
        </Field>
        <Field label="Date fin" required error={errors.date_fin?.message}>
          <Input type="date" {...register("date_fin")} />
        </Field>
      </div>
      <Field label="Type d absence" required>
        <NativeSelect {...register("type_absence")}>
          <option value="conge_paye">Conge paye</option>
          <option value="conge_sans_solde">Conge sans solde</option>
          <option value="maladie">Maladie</option>
          <option value="maternite">Maternite</option>
          <option value="paternite">Paternite</option>
          <option value="autre">Autre</option>
        </NativeSelect>
      </Field>
      <Field label="Justification">
        <Textarea placeholder="Precisez le motif" {...register("justification")} />
      </Field>
      <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" variant="primary" loading={isSubmitting}>
          Soumettre
        </Button>
      </div>
    </form>
  );
}
