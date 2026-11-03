"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { competenceSchema, type CompetenceInput } from "@/lib/schemas";
import {apiClient, getUserErrorMessage } from "@/lib/fetcher";
import { stripEmpty } from "@/lib/rh-normalizers";
import { Field, Input, NativeSelect } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { useEmployes } from "@/hooks/api";

type Props = { onSuccess?: () => void; onCancel?: () => void };

const CATEGORIES = ["Programming", "Database", "Design", "Soft skills", "Langues", "Management", "Autre"];

export default function CompetenceForm({ onSuccess, onCancel }: Props) {
  const { employes } = useEmployes({ statut: "actif" });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompetenceInput>({
    resolver: zodResolver(competenceSchema) as unknown as Resolver<CompetenceInput>,
    defaultValues: { employe_id: 0, nom_competence: "", categorie: "Programming", niveau: "intermediaire" },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await apiClient.post("/competences", stripEmpty(data));
      toast.success("Compétence ajoutée");
      onSuccess?.();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Employé" required error={errors.employe_id?.message}>
        <NativeSelect {...register("employe_id")} defaultValue="">
          <option value="" disabled>Sélectionner</option>
          {employes.map((e) => (
            <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Nom de la compétence" required error={errors.nom_competence?.message}>
        <Input placeholder="TypeScript" {...register("nom_competence")} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Catégorie">
          <NativeSelect {...register("categorie")}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Niveau" required>
          <NativeSelect {...register("niveau")}>
            <option value="debutant">Débutant</option>
            <option value="intermediaire">Intermédiaire</option>
            <option value="avance">Avancé</option>
            <option value="expert">Expert</option>
          </NativeSelect>
        </Field>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-4">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Annuler</Button>}
        <Button type="submit" variant="primary" loading={isSubmitting}>Ajouter</Button>
      </div>
    </form>
  );
}
