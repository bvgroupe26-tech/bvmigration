"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, type Path, type Resolver, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { arriveePresenceSchema, presenceSchema, type PresenceInput } from "@/lib/schemas";
import { apiClient, getUserErrorMessage } from "@/lib/fetcher";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { useEmployes, usePresences } from "@/hooks/api";
import { nowTimeValue, presenceToApiPayload } from "@/lib/presence-payload";
import type { Presence } from "@/lib/types";

export type PresenceFormMode = "arrivee" | "sortie" | "complet";

type Props = {
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultDate?: string;
  defaultEmployeId?: number;
  initialMode?: PresenceFormMode;
  existingPresence?: Presence | null;
};

const sortieSchema = z.object({
  employe_id: z.coerce.number().int().positive("Employé requis"),
  date: z.string().min(4, "Date requise"),
  heure_sortie: z.string().min(1, "Heure de sortie requise"),
  heures_supplementaires: z.coerce.number().min(0).default(0),
  justification: z.string().optional().or(z.literal("")),
});

type SortieInput = z.infer<typeof sortieSchema>;

const MODE_LABELS: Record<PresenceFormMode, string> = {
  arrivee: "Arrivée",
  sortie: "Sortie",
  complet: "Saisie complète",
};

export default function PresenceForm({
  onSuccess,
  onCancel,
  defaultDate,
  defaultEmployeId,
  initialMode = "arrivee",
  existingPresence = null,
}: Props) {
  const [mode, setMode] = useState<PresenceFormMode>(
    existingPresence?.heure_entree && !existingPresence.heure_sortie ? "sortie" : initialMode
  );
  const { employes } = useEmployes({ statut: "actif" });

  const arriveeForm = useForm<PresenceInput>({
    resolver: zodResolver(arriveePresenceSchema) as unknown as Resolver<PresenceInput>,
    defaultValues: {
      employe_id: defaultEmployeId ?? 0,
      date: defaultDate ?? new Date().toISOString().slice(0, 10),
      heure_entree: nowTimeValue(),
      heure_sortie: "",
      statut: "present",
      justification: "",
      heures_supplementaires: 0,
    },
  });

  const sortieForm = useForm<SortieInput>({
    resolver: zodResolver(sortieSchema) as unknown as Resolver<SortieInput>,
    defaultValues: {
      employe_id: defaultEmployeId ?? existingPresence?.employe_id ?? 0,
      date: defaultDate ?? existingPresence?.date ?? new Date().toISOString().slice(0, 10),
      heure_sortie: nowTimeValue(),
      heures_supplementaires: existingPresence?.heures_supplementaires ?? 0,
      justification: existingPresence?.justification ?? "",
    },
  });

  const completForm = useForm<PresenceInput>({
    resolver: zodResolver(presenceSchema) as unknown as Resolver<PresenceInput>,
    defaultValues: {
      employe_id: defaultEmployeId ?? 0,
      date: defaultDate ?? new Date().toISOString().slice(0, 10),
      heure_entree: "08:00",
      heure_sortie: "17:30",
      statut: "present",
      justification: "",
      heures_supplementaires: 0,
    },
  });

  const sortieEmployeId = sortieForm.watch("employe_id");
  const sortieDate = sortieForm.watch("date");

  const { presences: sortieLookup, isLoading: loadingSortie } = usePresences(
    sortieEmployeId && sortieDate
      ? { employe_id: Number(sortieEmployeId), date: sortieDate, limit: 5 }
      : undefined
  );

  const openPresence = useMemo(() => {
    if (existingPresence) return existingPresence;
    return sortieLookup.find((p) => !p.heure_sortie) ?? sortieLookup[0] ?? null;
  }, [existingPresence, sortieLookup]);

  useEffect(() => {
    if (!existingPresence) return;
    sortieForm.reset({
      employe_id: existingPresence.employe_id,
      date: existingPresence.date,
      heure_sortie: nowTimeValue(),
      heures_supplementaires: existingPresence.heures_supplementaires ?? 0,
      justification: existingPresence.justification ?? "",
    });
  }, [existingPresence, sortieForm]);

  async function submitArrivee(data: PresenceInput) {
    const payload = presenceToApiPayload({
      employe_id: data.employe_id,
      date: data.date,
      heure_entree: data.heure_entree,
      statut: data.statut,
      justification: data.justification,
      heures_supplementaires: 0,
    });
    await apiClient.post<Presence>("/presences", payload);
    toast.success("Arrivée enregistrée");
  }

  async function submitSortie(data: SortieInput) {
    if (!openPresence?.id) {
      toast.error("Aucune arrivée trouvée pour cet employé à cette date. Enregistrez d'abord l'arrivée.");
      return;
    }
    if (openPresence.heure_sortie) {
      toast.error("La sortie est déjà enregistrée pour ce jour.");
      return;
    }
    const payload = presenceToApiPayload({
      heure_sortie: data.heure_sortie,
      heures_supplementaires: data.heures_supplementaires,
      justification: data.justification || openPresence.justification,
    });
    await apiClient.put<Presence>(`/presences/${openPresence.id}`, payload);
    toast.success("Sortie enregistrée");
  }

  async function submitComplet(data: PresenceInput) {
    const payload = presenceToApiPayload({
      employe_id: data.employe_id,
      date: data.date,
      heure_entree: data.heure_entree,
      heure_sortie: data.heure_sortie,
      statut: data.statut,
      justification: data.justification,
      heures_supplementaires: data.heures_supplementaires,
    });
    await apiClient.post<Presence>("/presences", payload);
    toast.success("Présence enregistrée");
  }

  const onArrivee = arriveeForm.handleSubmit(async (data) => {
    try {
      await submitArrivee(data);
      onSuccess?.();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    }
  });

  const onSortie = sortieForm.handleSubmit(async (data) => {
    try {
      await submitSortie(data);
      onSuccess?.();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    }
  });

  const onComplet = completForm.handleSubmit(async (data) => {
    try {
      await submitComplet(data);
      onSuccess?.();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    }
  });

  const isSubmitting =
    arriveeForm.formState.isSubmitting ||
    sortieForm.formState.isSubmitting ||
    completForm.formState.isSubmitting;

  return (
    <div className="space-y-4">
      {!existingPresence ? (
        <div className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-50 p-1">
          {(["arrivee", "sortie", "complet"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm ${
                mode === m
                  ? "bg-white text-[#1F3F73] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      ) : null}

      {mode === "arrivee" && (
        <form onSubmit={onArrivee} className="space-y-4">
          <p className="rounded-xl border border-[#d9e4f5] bg-[#f4f8ff] px-3 py-2 text-xs text-[#1F3F73]">
            Enregistrez uniquement l&apos;arrivée. La sortie pourra être saisie plus tard, dans un second temps.
          </p>
          <EmployeField
            register={arriveeForm.register}
            employes={employes}
            error={arriveeForm.formState.errors.employe_id?.message}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Date d'arrivée" required error={arriveeForm.formState.errors.date?.message}>
              <Input type="date" {...arriveeForm.register("date")} />
            </Field>
            <Field label="Heure d'arrivée" required error={arriveeForm.formState.errors.heure_entree?.message}>
              <Input type="time" {...arriveeForm.register("heure_entree")} />
            </Field>
            <Field label="Statut" required className="sm:col-span-2">
              <NativeSelect {...arriveeForm.register("statut")}>
                <option value="present">Présent</option>
                <option value="retard">Retard</option>
                <option value="absent">Absent</option>
                <option value="conge">Congé</option>
                <option value="mission">Mission</option>
              </NativeSelect>
            </Field>
          </div>
          <Field label="Justification (si retard ou absence)">
            <Textarea placeholder="Optionnel" {...arriveeForm.register("justification")} />
          </Field>
          <FormActions onCancel={onCancel} isSubmitting={isSubmitting} submitLabel="Enregistrer l'arrivée" />
        </form>
      )}

      {mode === "sortie" && (
        <form onSubmit={onSortie} className="space-y-4">
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Enregistrez la sortie plus tard, sans resaisir l&apos;arrivée. L&apos;employé doit déjà avoir une arrivée
            ce jour-là.
          </p>
          <EmployeField
            register={sortieForm.register}
            employes={employes}
            error={sortieForm.formState.errors.employe_id?.message}
            disabled={Boolean(existingPresence)}
          />
          <Field label="Date du pointage" required error={sortieForm.formState.errors.date?.message}>
            <Input type="date" {...sortieForm.register("date")} disabled={Boolean(existingPresence)} />
          </Field>

          {loadingSortie ? (
            <p className="text-xs text-slate-500">Recherche du pointage d&apos;arrivée…</p>
          ) : openPresence ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
              <p className="font-medium text-slate-900">Arrivée déjà enregistrée</p>
              <p className="mt-0.5 text-xs text-slate-600">
                {openPresence.heure_entree ?? "—"} · statut {openPresence.statut}
                {openPresence.heure_sortie ? ` · sortie ${openPresence.heure_sortie}` : ""}
              </p>
            </div>
          ) : sortieEmployeId && sortieDate ? (
            <p className="text-xs text-red-600">Aucune arrivée pour cette date. Utilisez l&apos;onglet Arrivée d&apos;abord.</p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Heure de sortie" required error={sortieForm.formState.errors.heure_sortie?.message}>
              <Input type="time" {...sortieForm.register("heure_sortie")} />
            </Field>
            <Field label="Heures supplémentaires">
              <Input type="number" min={0} step={0.5} {...sortieForm.register("heures_supplementaires")} />
            </Field>
          </div>
          <Field label="Note de fin de journée">
            <Textarea placeholder="Optionnel" {...sortieForm.register("justification")} />
          </Field>
          <FormActions
            onCancel={onCancel}
            isSubmitting={isSubmitting}
            submitLabel="Enregistrer la sortie"
            disabled={!openPresence || Boolean(openPresence.heure_sortie)}
          />
        </form>
      )}

      {mode === "complet" && (
        <form onSubmit={onComplet} className="space-y-4">
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Saisie manuelle complète (arrivée et sortie en une fois), pour corriger ou rattraper un jour passé.
          </p>
          <EmployeField
            register={completForm.register}
            employes={employes}
            error={completForm.formState.errors.employe_id?.message}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Date" required error={completForm.formState.errors.date?.message}>
              <Input type="date" {...completForm.register("date")} />
            </Field>
            <Field label="Statut" required>
              <NativeSelect {...completForm.register("statut")}>
                <option value="present">Présent</option>
                <option value="retard">Retard</option>
                <option value="absent">Absent</option>
                <option value="conge">Congé</option>
                <option value="mission">Mission</option>
              </NativeSelect>
            </Field>
            <Field label="Heure d'entrée">
              <Input type="time" {...completForm.register("heure_entree")} />
            </Field>
            <Field label="Heure de sortie">
              <Input type="time" {...completForm.register("heure_sortie")} />
            </Field>
            <Field label="Heures supplémentaires" className="sm:col-span-2">
              <Input type="number" min={0} step={0.5} {...completForm.register("heures_supplementaires")} />
            </Field>
          </div>
          <Field label="Justification">
            <Textarea placeholder="Optionnel" {...completForm.register("justification")} />
          </Field>
          <FormActions onCancel={onCancel} isSubmitting={isSubmitting} submitLabel="Enregistrer" />
        </form>
      )}
    </div>
  );
}

function EmployeField<T extends { employe_id: number }>({
  register,
  employes,
  error,
  disabled,
}: {
  register: UseFormRegister<T>;
  employes: { id: number; prenom: string; nom: string; poste?: string | null }[];
  error?: string;
  disabled?: boolean;
}) {
  return (
    <Field label="Employé" required error={error}>
      <NativeSelect {...register("employe_id" as Path<T>)} defaultValue="" disabled={disabled}>
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
  );
}

function FormActions({
  onCancel,
  isSubmitting,
  submitLabel,
  disabled,
}: {
  onCancel?: () => void;
  isSubmitting: boolean;
  submitLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
      {onCancel ? (
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Annuler
        </Button>
      ) : null}
      <Button type="submit" variant="primary" loading={isSubmitting} disabled={disabled}>
        {submitLabel}
      </Button>
    </div>
  );
}
