"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { registerSchema, type RegisterInput } from "@/lib/schemas";
import { apiFetch, setAuthToken, getUserErrorMessage } from "@/lib/api-client";
import Button from "@/components/ui/Button";
import { Field, Input, NativeSelect } from "@/components/ui/Field";

export default function RegisterForm() {
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema) as unknown as Resolver<RegisterInput>,
    defaultValues: {
      email: "",
      password: "",
      password_confirm: "",
      nom: "",
      prenom: "",
      role: "rh",
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      const { password_confirm: _, ...payload } = data;
      const result = await apiFetch<{ access_token: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      await setAuthToken(result.data.access_token);
      toast.success("Compte créé — vous êtes connecté(e)");
      router.push("/dashboard");
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
            <Input type="text" autoComplete="given-name" placeholder="Jean" className="pl-10" {...register("prenom")} />
          </div>
        </Field>
        <Field label="Nom" required error={errors.nom?.message}>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input type="text" autoComplete="family-name" placeholder="Dupont" className="pl-10" {...register("nom")} />
          </div>
        </Field>
      </div>

      <Field label="Email" required error={errors.email?.message}>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="email"
            autoComplete="email"
            placeholder="vous@entreprise.com"
            className="pl-10"
            {...register("email")}
          />
        </div>
      </Field>

      <Field label="Profil" hint="Les comptes administrateur ne se créent pas ici." error={errors.role?.message as string | undefined}>
        <NativeSelect {...register("role")}>
          <option value="rh">RH</option>
          <option value="manager">Manager</option>
        </NativeSelect>
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

      <Button type="submit" variant="primary" full loading={isSubmitting} className="h-12 text-[15px]">
        Créer mon compte
      </Button>

      <p className="text-center text-sm text-slate-600">
        Déjà inscrit ?{" "}
        <Link href="/login" className="font-semibold text-[#2F5F9D] hover:text-[#1F3F73]">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
