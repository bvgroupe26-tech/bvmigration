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
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

type LoginInput = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [showPwd, setShowPwd] = useState(false);

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
      const target = safeRedirect || roleHome;
      toast.success("Connexion réussie");
      // Navigation complète : évite les blocages de session sur mobile (PWA / Safari).
      window.location.assign(target);
    } catch (err) {
      toast.error(getUserErrorMessage(err, "Connexion impossible. Vérifiez votre email et votre mot de passe."));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
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
            autoComplete="email"
            placeholder="vous@entreprise.com"
            className="!pl-11"
            {...register("email")}
          />
        </div>
      </Field>

      <Field label="Mot de passe" required error={errors.password?.message}>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type={showPwd ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className="!pl-11 !pr-11"
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
