"use client";

import { useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, Shield, User } from "lucide-react";
import { staffAccountSchema, type StaffAccountInput } from "@/lib/schemas";
import { createStaffAccount } from "@/lib/staff-account-api";
import { getUserErrorMessage } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  canCreateStaffRole,
  getCreatableStaffRoles,
  type StaffAccountRole,
} from "@/lib/roles";
import { normalizeAppRole } from "@/lib/session";
import Button from "@/components/ui/Button";
import { Field, Input, NativeSelect } from "@/components/ui/Field";
import GlassCard from "@/components/ui/GlassCard";

type Props = {
  onSuccess?: () => void;
};

export default function StaffAccountForm({ onSuccess }: Props) {
  const { user } = useAuth();
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  const creatorRole = normalizeAppRole(user?.role);
  const creatableRoles = useMemo(
    () => getCreatableStaffRoles(user?.role),
    [user?.role]
  );

  const defaultRole: StaffAccountRole = creatableRoles.includes("rh")
    ? "rh"
    : creatableRoles[0] ?? "rh";

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StaffAccountInput>({
    resolver: zodResolver(staffAccountSchema) as unknown as Resolver<StaffAccountInput>,
    defaultValues: {
      email: "",
      password: "",
      password_confirm: "",
      nom: "",
      prenom: "",
      role: defaultRole,
    },
  });

  const selectedRole = watch("role") as StaffAccountRole;

  const onSubmit = handleSubmit(async (data) => {
    if (!canCreateStaffRole(user?.role, data.role)) {
      toast.error("Vous n'avez pas l'autorisation de créer ce type de compte.");
      return;
    }

    try {
      const { password_confirm: _, ...payload } = data;
      await createStaffAccount(payload);
      toast.success(
        `Compte ${ROLE_LABELS[data.role]} créé pour ${data.prenom} ${data.nom}. La personne peut se connecter avec son email.`
      );
      reset({
        email: "",
        password: "",
        password_confirm: "",
        nom: "",
        prenom: "",
        role: defaultRole,
      });
      onSuccess?.();
    } catch (err) {
      toast.error(
        getUserErrorMessage(
          err,
          "Création impossible. Vérifiez que l'email n'existe pas déjà ou contactez le support technique."
        )
      );
    }
  });

  if (creatableRoles.length === 0) {
    return (
      <GlassCard className="p-6">
        <p className="text-sm text-slate-600">
          Votre profil ne permet pas de créer des comptes administration. Contactez un administrateur BV
          Groupe.
        </p>
      </GlassCard>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <GlassCard className="border-[#E8F0FA] bg-[#F8FAFD] p-4">
        <div className="flex gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[#2F5F9D]" />
          <div className="text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Accès au panneau administration</p>
            <p className="mt-1">
              Rôles autorisés : <strong>Administrateur</strong>, <strong>RH</strong> et{" "}
              <strong>Manager</strong>. Les employés se créent depuis{" "}
              <span className="font-medium">Employés → Nouvel employé</span> (compte espace personnel).
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Prénom" required error={errors.prenom?.message}>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input type="text" autoComplete="off" placeholder="Jean" className="!pl-10" {...register("prenom")} />
          </div>
        </Field>
        <Field label="Nom" required error={errors.nom?.message}>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input type="text" autoComplete="off" placeholder="Dupont" className="!pl-10" {...register("nom")} />
          </div>
        </Field>
      </div>

      <Field label="Email professionnel" required error={errors.email?.message}>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="email"
            autoComplete="off"
            placeholder="prenom.nom@bvgroupe.com"
            className="!pl-10"
            {...register("email")}
          />
        </div>
      </Field>

      <Field label="Profil / rôle" required error={errors.role?.message}>
        <NativeSelect {...register("role")}>
          {creatableRoles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </NativeSelect>
        <p className="mt-2 text-xs text-slate-500">{ROLE_DESCRIPTIONS[selectedRole]}</p>
        {creatorRole !== "admin" ? (
          <p className="mt-1 text-xs text-amber-800">
            Seul un administrateur peut créer un compte « Administrateur ».
          </p>
        ) : null}
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Mot de passe initial" required error={errors.password?.message}>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Au moins 8 caractères"
              className="!pl-10 !pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
              aria-label={showPwd ? "Masquer" : "Afficher"}
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
              className="!pl-10 !pr-10"
              {...register("password_confirm")}
            />
            <button
              type="button"
              onClick={() => setShowPwd2((v) => !v)}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
              aria-label={showPwd2 ? "Masquer" : "Afficher"}
            >
              {showPwd2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" variant="primary" loading={isSubmitting}>
          Créer le compte
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            reset({
              email: "",
              password: "",
              password_confirm: "",
              nom: "",
              prenom: "",
              role: defaultRole,
            })
          }
        >
          Réinitialiser le formulaire
        </Button>
      </div>
    </form>
  );
}
