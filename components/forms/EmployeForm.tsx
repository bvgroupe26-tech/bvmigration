"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, UserPlus, UserCog } from "lucide-react";
import {
  employeSchema,
  registerEmployeeSchema,
  type EmployeInput,
  type RegisterEmployeeInput,
} from "@/lib/schemas";
import {apiClient, getUserErrorMessage } from "@/lib/fetcher";
import { apiFetch } from "@/lib/api-client";
import { Field, Input, NativeSelect } from "@/components/ui/Field";
import MoneyInput from "@/components/ui/MoneyInput";
import Button from "@/components/ui/Button";
import type { Employe } from "@/lib/types";
import { normalizeEmploye } from "@/lib/employe-utils";
import { prepareEmployeApiPayload } from "@/lib/employe-payload";
import { usePostes } from "@/hooks/usePostes";
import { localDateISO } from "@/lib/date-local";

const DEPARTEMENT_SUGGESTIONS = [
  "Tech",
  "Commercial",
  "Marketing",
  "Finance",
  "RH",
  "Direction",
  "Produit",
  "Juridique",
  "Support",
];

type EmployeFormProps = {
  employe?: Employe | null;
  onSuccess?: (e: Employe) => void;
  onCancel?: () => void;
};

type FormData = RegisterEmployeeInput;

export default function EmployeForm({ employe, onSuccess, onCancel }: EmployeFormProps) {
  const isEdit = !!employe;
  const [withAccount, setWithAccount] = useState(!isEdit);
  const [showPwd, setShowPwd] = useState(false);
  const [showPwdConfirm, setShowPwdConfirm] = useState(false);

  const schema = !isEdit && withAccount ? registerEmployeeSchema : employeSchema;

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as unknown as Resolver<FormData>,
    defaultValues: {
      nom: "",
      prenom: "",
      email: "",
      telephone: "",
      date_naissance: "",
      adresse: "",
      situation_familiale: "",
      nombre_enfants: 0,
      poste: "",
      departement: "",
      type_contrat: "" as unknown as EmployeInput["type_contrat"],
      salaire_base: 0,
      date_embauche: "",
      date_fin_contrat: "",
      statut: "actif",
      def_prime_transport: 0,
      def_prime_logement: 0,
      def_prime_performance: 0,
      def_autres_primes: 0,
      def_taux_cnss: undefined,
      def_taux_impot: undefined,
      password: "",
      password_confirm: "",
    },
  });

  useEffect(() => {
    if (!employe) return;
    reset({
      nom: employe.nom,
      prenom: employe.prenom,
      email: employe.email ?? "",
      telephone: employe.telephone ?? "",
      date_naissance: employe.date_naissance ?? "",
      adresse: employe.adresse ?? "",
      situation_familiale: employe.situation_familiale ?? "",
      nombre_enfants: employe.nombre_enfants,
      poste: employe.poste ?? "",
      departement: employe.departement ?? "",
      type_contrat: (employe.type_contrat ?? "CDI") as EmployeInput["type_contrat"],
      salaire_base: employe.salaire_base,
      date_embauche:
        employe.date_embauche ?? localDateISO(),
      date_fin_contrat:
        employe.date_fin_contrat ??
        (employe as { dateFinContrat?: string | null }).dateFinContrat ??
        "",
      statut: employe.statut,
      def_prime_transport: employe.def_prime_transport ?? 0,
      def_prime_logement: employe.def_prime_logement ?? 0,
      def_prime_performance: employe.def_prime_performance ?? 0,
      def_autres_primes: employe.def_autres_primes ?? 0,
      def_taux_cnss: employe.def_taux_cnss ?? undefined,
      def_taux_impot: employe.def_taux_impot ?? undefined,
      password: "",
      password_confirm: "",
    });
  }, [employe, reset]);

  const statut = watch("statut");
  const posteValue = watch("poste");
  const { postes, isLoading: loadingPostes } = usePostes();
  const posteOptions = useMemo(() => {
    const labels = new Set(postes);
    const current = typeof posteValue === "string" ? posteValue.trim() : "";
    if (current) labels.add(current);
    return Array.from(labels).sort((a, b) => a.localeCompare(b, "fr"));
  }, [postes, posteValue]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (isEdit) {
        const { password: _p, password_confirm: _pc, ...employeData } = data;
        const raw = await apiClient.put<unknown>(
          `/employes/${employe.id}`,
          prepareEmployeApiPayload(employeData)
        );
        const result = normalizeEmploye(raw);
        toast.success(`${result.prenom} ${result.nom} mis à jour`);
        onSuccess?.(result);
      } else if (withAccount) {
        const { password_confirm: _pc, ...rest } = data;
        const payload = {
          ...prepareEmployeApiPayload({
            email: rest.email,
            nom: rest.nom,
            prenom: rest.prenom,
            telephone: rest.telephone,
            adresse: rest.adresse,
            poste: rest.poste,
            departement: rest.departement,
            type_contrat: rest.type_contrat,
            date_embauche: rest.date_embauche,
            salaire_base: rest.salaire_base,
          }),
          password: rest.password,
        };
        const resp = await apiFetch<{
          user: { nom: string; prenom: string; employeId?: number | null };
        }>(
          "/auth/register-employee",
          { method: "POST", body: JSON.stringify(payload) },
        );
        if (!resp.ok) throw new Error(resp.error ?? "Erreur lors de la création du compte");
        toast.success(`Compte employé créé pour ${data.prenom} ${data.nom}`);
        const employeId = resp.data.user.employeId;
        if (typeof employeId === "number" && employeId > 0) {
          onSuccess?.({
            id: employeId,
            nom: data.nom,
            prenom: data.prenom,
          } as Employe);
        } else {
          // Fallback: ne pas casser le flux si l'ID n'est pas retourné
          onSuccess?.({
            id: 0,
            nom: data.nom,
            prenom: data.prenom,
          } as Employe);
        }
      } else {
        const { password: _p, password_confirm: _pc, ...employeData } = data;
        const raw = await apiClient.post<unknown>(
          "/employes",
          prepareEmployeApiPayload(employeData)
        );
        const result = normalizeEmploye(raw);
        toast.success(`${result.prenom} ${result.nom} ajouté(e)`);
        onSuccess?.(result);
      }
    } catch (err) {
      const msg = getUserErrorMessage(err);
      toast.error(msg);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {!isEdit && (
        <div className="flex items-center gap-2 rounded-xl border border-[#2F5F9D]/20 bg-[#E8F0FA]/80 p-3">
          <button
            type="button"
            onClick={() => setWithAccount(true)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              withAccount
                ? "bg-[#2F5F9D] text-white shadow-sm"
                : "text-slate-600 hover:bg-white"
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Avec compte (email + mot de passe)
          </button>
          <button
            type="button"
            onClick={() => setWithAccount(false)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              !withAccount
                ? "bg-[#2F5F9D] text-white shadow-sm"
                : "text-slate-600 hover:bg-white"
            }`}
          >
            <UserCog className="h-4 w-4" />
            Fiche RH uniquement
          </button>
        </div>
      )}

      {!isEdit && withAccount ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-950">
          <strong>Membre RH ou manager ?</strong> Ne créez pas le compte ici (rôle « Employé »
          uniquement). Créez d&apos;abord la <strong>fiche RH sans compte</strong>, puis le compte
          dans <strong>Administration → Comptes</strong> avec le rôle RH. La fiche suffit pour inclure
          le salaire dans la masse salariale.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Prénom" required error={errors.prenom?.message}>
          <Input placeholder="Jean" {...register("prenom")} />
        </Field>
        <Field label="Nom" required error={errors.nom?.message}>
          <Input placeholder="Dupont" {...register("nom")} />
        </Field>
        <Field label="Email" required error={errors.email?.message}>
          <Input type="email" placeholder="jean.dupont@bvgroupe.com" {...register("email")} />
        </Field>
        <Field label="Téléphone" required error={errors.telephone?.message}>
          <Input placeholder="+241 06 12 34 56" {...register("telephone")} />
        </Field>

        {!isEdit && withAccount && (
          <>
            <Field label="Mot de passe" required error={errors.password?.message}>
              <div className="relative">
                <Input
                  type={showPwd ? "text" : "password"}
                  placeholder="Min. 8 caractères"
                  className="pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Field label="Confirmer le mot de passe" required error={errors.password_confirm?.message}>
              <div className="relative">
                <Input
                  type={showPwdConfirm ? "text" : "password"}
                  placeholder="Retapez le mot de passe"
                  className="pr-10"
                  {...register("password_confirm")}
                />
                <button
                  type="button"
                  onClick={() => setShowPwdConfirm(!showPwdConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPwdConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
          </>
        )}

        <Field label="Date de naissance">
          <Input type="date" {...register("date_naissance")} />
        </Field>
        <Field label="Adresse">
          <Input placeholder="Libreville, Gabon" {...register("adresse")} />
        </Field>
        <Field label="Situation familiale">
          <NativeSelect {...register("situation_familiale")}>
            <option value="">—</option>
            <option value="celibataire">Célibataire</option>
            <option value="marie">Marié(e)</option>
            <option value="divorce">Divorcé(e)</option>
            <option value="veuf">Veuf(ve)</option>
          </NativeSelect>
        </Field>
        <Field label="Nombre d'enfants">
          <Input type="number" min={0} {...register("nombre_enfants")} />
        </Field>
      </div>

      <div className="h-px bg-slate-200" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Poste" required error={errors.poste?.message}>
          <Controller
            name="poste"
            control={control}
            render={({ field }) => (
              <NativeSelect
                {...field}
                value={field.value ?? ""}
                disabled={loadingPostes}
              >
                <option value="">
                  {loadingPostes ? "Chargement des postes…" : "— Choisir un poste —"}
                </option>
                {posteOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </NativeSelect>
            )}
          />
          <p className="text-[11px] text-slate-500">
            <Link href="/employes/postes" className="font-medium text-[#2F5F9D] hover:text-[#1F3F73]">
              Gérer le référentiel des postes
            </Link>
          </p>
        </Field>
        <Field label="Département" required hint="Saisie libre (suggestions ci-dessous)" error={errors.departement?.message}>
          <Input list="employe-departements" placeholder="Ex. Finance" {...register("departement")} />
          <datalist id="employe-departements">
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
            <option value="Interim">Intérim</option>
          </NativeSelect>
        </Field>
        <Field label="Salaire de base (FCFA)" required error={errors.salaire_base?.message}>
          <Controller
            name="salaire_base"
            control={control}
            render={({ field }) => (
              <MoneyInput
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="Ex. 450 000"
              />
            )}
          />
        </Field>
        <Field label="Date d'embauche" required error={errors.date_embauche?.message}>
          <Input type="date" {...register("date_embauche")} />
        </Field>
        <Field
          label="Date de fin de contrat"
          hint={
            statut === "inactif"
              ? "Obligatoire pour enregistrer un départ et générer le dernier bulletin proratisé."
              : "Optionnel — renseigner en cas de départ ou fin de CDD."
          }
          error={errors.date_fin_contrat?.message}
        >
          <Input type="date" {...register("date_fin_contrat")} />
        </Field>
        <Field label="Statut">
          <NativeSelect {...register("statut")}>
            <option value="actif">Actif</option>
            <option value="inactif">Inactif</option>
            <option value="suspendu">Suspendu</option>
          </NativeSelect>
        </Field>
      </div>

      {!withAccount && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Éléments de paie par défaut</h3>
          <p className="mt-1 text-xs text-text-secondary">
            Par défaut tous les montants ci-dessous sont à <strong>0</strong> (rien n&apos;est prérempli). Ils sont repris à la
            génération mensuelle des bulletins. Taux entre 0 et 1 en notation avec point (ex.&nbsp;0.056 pour 5,6&nbsp;%). CNSS
            sur le salaire de base ; impôt sur le brut si les deux taux sont renseignés.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Indemnité transport (FCFA)" error={errors.def_prime_transport?.message}>
              <Controller
                name="def_prime_transport"
                control={control}
                render={({ field }) => (
                  <MoneyInput value={field.value ?? 0} onChange={field.onChange} onBlur={field.onBlur} />
                )}
              />
            </Field>
            <Field label="Allocation logement (FCFA)" error={errors.def_prime_logement?.message}>
              <Controller
                name="def_prime_logement"
                control={control}
                render={({ field }) => (
                  <MoneyInput value={field.value ?? 0} onChange={field.onChange} onBlur={field.onBlur} />
                )}
              />
            </Field>
            <Field label="Prime performance (FCFA)" error={errors.def_prime_performance?.message}>
              <Controller
                name="def_prime_performance"
                control={control}
                render={({ field }) => (
                  <MoneyInput value={field.value ?? 0} onChange={field.onChange} onBlur={field.onBlur} />
                )}
              />
            </Field>
            <Field label="Autres primes (FCFA)" error={errors.def_autres_primes?.message}>
              <Controller
                name="def_autres_primes"
                control={control}
                render={({ field }) => (
                  <MoneyInput value={field.value ?? 0} onChange={field.onChange} onBlur={field.onBlur} />
                )}
              />
            </Field>
            <Field
              label="Taux CNSS (optionnel)"
              hint="Laisser vide = 0 à la génération"
              error={errors.def_taux_cnss?.message as string | undefined}
            >
              <Input type="number" step="0.0001" min={0} max={1} placeholder="0.056" {...register("def_taux_cnss")} />
            </Field>
            <Field
              label="Taux impôt (optionnel)"
              hint="Laisser vide = 0 à la génération"
              error={errors.def_taux_impot?.message as string | undefined}
            >
              <Input type="number" step="0.0001" min={0} max={1} placeholder="0.10" {...register("def_taux_impot")} />
            </Field>
          </div>
        </div>
      )}

      {!isEdit && withAccount && (
        <div className="rounded-xl border border-green-200 bg-green-50/60 p-4">
          <p className="text-sm text-green-800">
            <strong>Avec compte :</strong> un compte utilisateur (email + mot de passe) sera créé en plus de la fiche RH.
            L&apos;employé pourra se connecter immédiatement au portail.
          </p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Annuler
          </Button>
        )}
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {isEdit
            ? "Mettre à jour"
            : withAccount
              ? "Créer le compte employé"
              : "Créer l'employé"}
        </Button>
      </div>
    </form>
  );
}
