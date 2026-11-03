"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { offreSchema, type OffreInput } from "@/lib/schemas";
import {apiClient, getUserErrorMessage } from "@/lib/fetcher";
import { stripEmpty } from "@/lib/rh-normalizers";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

type Props = { onSuccess?: () => void; onCancel?: () => void };

const DEPARTEMENT_SUGGESTIONS = [
  "Tech",
  "Commercial",
  "Marketing",
  "Finance",
  "RH",
  "Direction",
  "Produit",
  "Juridique",
];

export default function OffreForm({ onSuccess, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OffreInput>({
    resolver: zodResolver(offreSchema) as unknown as Resolver<OffreInput>,
    defaultValues: {
      titre: "",
      departement: "",
      type_contrat: "" as OffreInput["type_contrat"],
      description: "",
      competences_requises: "",
      date_cloture: "",
      statut: "ouverte",
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await apiClient.post("/offres", stripEmpty(data));
      toast.success("Offre publiée");
      onSuccess?.();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Titre du poste" required error={errors.titre?.message}>
        <Input placeholder="Intitulé exact du poste" {...register("titre")} />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Département" required hint="Saisie libre" error={errors.departement?.message}>
          <Input list="offre-departements" placeholder="Ex. RH" {...register("departement")} />
          <datalist id="offre-departements">
            {DEPARTEMENT_SUGGESTIONS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </Field>
        <Field label="Type de contrat" required error={errors.type_contrat?.message as string | undefined}>
          <NativeSelect {...register("type_contrat")}>
            <option value="">— Choisir —</option>
            <option value="CDI">CDI</option>
            <option value="CDD">CDD</option>
            <option value="Stage">Stage</option>
            <option value="Freelance">Freelance</option>
          </NativeSelect>
        </Field>
        <Field label="Date de clôture">
          <Input type="date" {...register("date_cloture")} />
        </Field>
        <Field label="Objectif de candidatures" required error={errors.cible_candidats?.message}>
          <Input type="number" min={1} step={1} placeholder="Nombre visé" {...register("cible_candidats")} />
        </Field>
      </div>
      <Field label="Description du poste" required error={errors.description?.message}>
        <Textarea rows={5} placeholder="Missions, contexte, équipe, conditions (min. 20 caractères)" {...register("description")} />
      </Field>
      <Field label="Compétences requises" required hint="Séparées par des virgules si besoin" error={errors.competences_requises?.message}>
        <Input placeholder="Ex. gestion d'équipe, Excel, relation client" {...register("competences_requises")} />
      </Field>
      <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" variant="primary" loading={isSubmitting}>
          Publier
        </Button>
      </div>
    </form>
  );
}
