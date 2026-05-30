"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff, User, Phone, Briefcase } from "lucide-react";
import { registerEmployeePwaSchema, type RegisterEmployeePwaInput } from "@/lib/schemas";
import { apiFetch, getUserErrorMessage } from "@/lib/api-client";
import { extractAccessToken, setAccessToken } from "@/lib/authClient";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import { Field, Input, NativeSelect } from "@/components/ui/Field";

function toApiPayload(data: RegisterEmployeePwaInput) {
  const { password_confirm: _, ...rest } = data;
  const payload: Record<string, unknown> = {
    email: rest.email,
    password: rest.password,
    nom: rest.nom,
    prenom: rest.prenom,
  };
  if (rest.telephone) payload.telephone = rest.telephone;
  if (rest.adresse) payload.adresse = rest.adresse;
  if (rest.poste) payload.poste = rest.poste;
  if (rest.departement) payload.departement = rest.departement;
  if (rest.type_contrat) payload.typeContrat = rest.type_contrat;
  if (rest.date_embauche) payload.dateEmbauche = rest.date_embauche;
  return payload;
}

export default function RegisterEmployeeForm() {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterEmployeePwaInput>({
    resolver: zodResolver(registerEmployeePwaSchema) as unknown as Resolver<RegisterEmployeePwaInput>,
    defaultValues: {
      email: "",
      password: "",
      password_confirm: "",
      nom: "",
      prenom: "",
      telephone: "",
      adresse: "",
      poste: "",
      departement: "",
      type_contrat: "",
      date_embauche: "",
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      const result = await apiFetch<{ access_token: string }>("/auth/register-employee", {
        method: "POST",
        body: JSON.stringify(toApiPayload(data)),
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setAccessToken(extractAccessToken(result.data));
      await refreshSession();
      toast.success("Compte créé — bienvenue !");
      router.push("/employee/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(getUserErrorMessage(err, "Inscription impossible. Vérifiez vos informations."));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Prénom" required error={errors.prenom?.message}>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input type="text" autoComplete="given-name" placeholder="Patrick" className="pl-10" {...register("prenom")} />
          </div>
        </Field>
        <Field label="Nom" required error={errors.nom?.message}>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input type="text" autoComplete="family-name" placeholder="Mvondo" className="pl-10" {...register("nom")} />
          </div>
        </Field>
      </div>

      <Field label="Email professionnel" required error={errors.email?.message}>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="email"
            autoComplete="email"
            placeholder="employe@bvgroupe.com"
            className="pl-10"
            {...register("email")}
          />
        </div>
      </Field>

      <Field label="Mot de passe" required error={errors.password?.message}>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type={showPwd ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Au moins 8 caractères"
            className="pl-10 pr-10"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      <Field label="Confirmer le mot de passe" required error={errors.password_confirm?.message}>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type={showPwd2 ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Répétez le mot de passe"
            className="pl-10 pr-10"
            {...register("password_confirm")}
          />
          <button
            type="button"
            onClick={() => setShowPwd2((v) => !v)}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={showPwd2 ? "Masquer la confirmation" : "Afficher la confirmation"}
          >
            {showPwd2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      <button
        type="button"
        onClick={() => setShowOptional((v) => !v)}
        className="text-sm font-medium text-[#2F5F9D] hover:text-[#1F3F73]"
      >
        {showOptional ? "Masquer les champs optionnels" : "+ Informations complémentaires (optionnel)"}
      </button>

      {showOptional && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <Field label="Téléphone" error={errors.telephone?.message}>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input type="tel" placeholder="+241 06 12 34 56" className="pl-10" {...register("telephone")} />
            </div>
          </Field>
          <Field label="Adresse" error={errors.adresse?.message}>
            <Input placeholder="Libreville, Gabon" {...register("adresse")} />
          </Field>
          <Field label="Poste" error={errors.poste?.message}>
            <div className="relative">
              <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Responsable exploitation" className="pl-10" {...register("poste")} />
            </div>
          </Field>
          <Field label="Département" error={errors.departement?.message}>
            <Input placeholder="Exploitation" {...register("departement")} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Type de contrat" error={errors.type_contrat?.message}>
              <NativeSelect {...register("type_contrat")} defaultValue="">
                <option value="">—</option>
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="Stage">Stage</option>
                <option value="Freelance">Freelance</option>
                <option value="Interim">Intérim</option>
              </NativeSelect>
            </Field>
            <Field label="Date d'embauche" error={errors.date_embauche?.message}>
              <Input type="date" {...register("date_embauche")} />
            </Field>
          </div>
        </div>
      )}

      <Button type="submit" variant="primary" full loading={isSubmitting} className="h-12 text-[15px]">
        Créer mon compte employé
      </Button>

      <p className="text-center text-sm text-slate-600">
        Déjà inscrit ?{" "}
        <Link href="/login" className="font-semibold text-[#2F5F9D] hover:text-[#1F3F73]">
          Se connecter
        </Link>
      </p>
      <p className="text-center text-xs text-slate-500">
        Espace RH admin ?{" "}
        <Link href="/register" className="font-medium text-slate-600 underline-offset-2 hover:underline">
          Inscription RH / Manager
        </Link>
      </p>
    </form>
  );
}
