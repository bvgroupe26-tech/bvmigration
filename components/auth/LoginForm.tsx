"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getUserErrorMessage } from "@/lib/apiClient";
import { getHomeRouteByRole } from "@/lib/session";
import { canRoleAccessPath } from "@/lib/roles";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

type LoginInput = z.infer<typeof loginSchema>;

/**
 * Poste partagé : le navigateur ne doit ni pré-remplir ni proposer d'enregistrer les identifiants.
 * Désactivable avec NEXT_PUBLIC_ALLOW_PASSWORD_MANAGER=1 (gestionnaire de mots de passe autorisé).
 */
const BLOCK_PASSWORD_MANAGER = process.env.NEXT_PUBLIC_ALLOW_PASSWORD_MANAGER !== "1";

/** Consignes aux gestionnaires courants (LastPass, 1Password, Bitwarden, Dashlane). */
const NO_MANAGER_ATTRS = BLOCK_PASSWORD_MANAGER
  ? ({
      "data-lpignore": "true",
      "data-1p-ignore": "true",
      "data-bwignore": "true",
      "data-form-type": "other",
    } as const)
  : {};

type GuardedField = "email" | "password";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [showPwd, setShowPwd] = useState(false);
  // Champ en lecture seule jusqu'au premier clic : le remplissage automatique du navigateur n'y écrit pas.
  const [touched, setTouched] = useState<Record<GuardedField, boolean>>({ email: false, password: false });
  const guard = (field: GuardedField) =>
    BLOCK_PASSWORD_MANAGER
      ? {
          readOnly: !touched[field],
          onFocus: () => setTouched((t) => (t[field] ? t : { ...t, [field]: true })),
          ...NO_MANAGER_ATTRS,
        }
      : {};

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema) as unknown as Resolver<LoginInput>,
    defaultValues: { email: "", password: "" },
  });

  const redirectTo =
    searchParams.get("next") ||
    searchParams.get("from") ||
    "";

  const safeRedirect = redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "";
  const noPublicSignup = searchParams.get("notice") === "no-public-signup";

  const onSubmit = handleSubmit(async (data) => {
    try {
      const profile = await login(data);
      const roleHome = getHomeRouteByRole(profile?.role);
      const target =
        safeRedirect && canRoleAccessPath(profile?.role, safeRedirect, profile?.employeId)
          ? safeRedirect
          : roleHome;
      toast.success("Connexion réussie");
      // Navigation complète : évite les blocages de session sur mobile (PWA / Safari).
      window.location.assign(target);
    } catch (err) {
      toast.error(getUserErrorMessage(err, "Connexion impossible. Vérifiez votre email et votre mot de passe."));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" autoComplete={BLOCK_PASSWORD_MANAGER ? "off" : undefined}>
      {noPublicSignup ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">
          L&apos;inscription en ligne n&apos;est pas disponible. Votre compte est créé par le service RH.
        </p>
      ) : null}

      <Field label="Email" required error={errors.email?.message}>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="email"
            autoComplete={BLOCK_PASSWORD_MANAGER ? "off" : "email"}
            placeholder="vous@entreprise.com"
            className="!pl-11"
            {...guard("email")}
            {...register("email")}
          />
        </div>
      </Field>

      <Field label="Mot de passe" required error={errors.password?.message}>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type={showPwd ? "text" : "password"}
            // « new-password » : Chrome n'y propose pas les mots de passe enregistrés (il ignore « off »).
            autoComplete={BLOCK_PASSWORD_MANAGER ? "new-password" : "current-password"}
            placeholder="••••••••"
            className="!pl-11 !pr-11"
            {...guard("password")}
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

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => toast.message("Contactez l'administrateur BV GROUPE pour réinitialiser votre accès.")}
          className="text-sm font-medium text-[#2F5F9D] transition hover:text-[#1F3F73]"
        >
          Mot de passe oublié ?
        </button>
      </div>

      <Button type="submit" variant="primary" full loading={isSubmitting} className="h-12 text-[15px]">
        Se connecter
      </Button>

      <p className="text-center text-sm text-slate-600">
        Pas encore de compte ? Contactez le service RH — seuls les responsables RH créent les accès.
      </p>
    </form>
  );
}
