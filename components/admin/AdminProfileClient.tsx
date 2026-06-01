"use client";

import Link from "next/link";
import { LogOut, Mail, Shield, User } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useProfilePhoto } from "@/hooks/useProfilePhoto";
import ProfilePhotoEditor from "@/components/profile/ProfilePhotoEditor";
import GlassCard from "@/components/ui/GlassCard";
import { getUserErrorMessage } from "@/lib/utils";
import { normalizeAppRole } from "@/lib/session";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  manager: "Manager",
  rh: "Ressources humaines",
  employee: "Employé",
};

export default function AdminProfileClient() {
  const { user, logout, refreshSession } = useAuth();
  const { photoUrl, uploading, uploadPhoto, usesLocalOnly } = useProfilePhoto();
  const router = useRouter();

  if (!user) return null;

  const roleKey = normalizeAppRole(user.role) ?? user.role;
  const roleLabel = ROLE_LABELS[roleKey] ?? user.role;

  async function handleLogout() {
    try {
      await logout();
      toast.success("À bientôt");
      router.replace("/login");
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    }
  }

  async function handlePhoto(file: File | undefined) {
    try {
      await uploadPhoto(file);
      toast.success("Photo de profil mise à jour");
    } catch (err) {
      toast.error(getUserErrorMessage(err, "Impossible d'envoyer la photo."));
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <ProfilePhotoEditor
          nom={user.nom}
          prenom={user.prenom}
          photoUrl={photoUrl}
          uploading={uploading}
          onPickFile={handlePhoto}
        />
        <h1 className="mt-4 font-display text-2xl font-bold text-slate-900">
          {user.prenom} {user.nom}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{user.email}</p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#2F5F9D]/20 bg-[#E8F0FA] px-3 py-1 text-xs font-semibold text-[#1F3F73]">
          <Shield className="h-3.5 w-3.5" aria-hidden />
          {roleLabel}
        </span>
        {usesLocalOnly ? (
          <p className="mx-auto mt-3 max-w-sm text-xs text-slate-500">
            Photo enregistrée sur cet appareil. Liez votre compte à une fiche employé pour la
            synchroniser sur le serveur.
          </p>
        ) : (
          <p className="mt-2 text-xs text-slate-500">Appuyez sur l&apos;icône appareil photo pour changer votre photo.</p>
        )}
      </section>

      <GlassCard className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Compte</p>
        </div>
        <dl className="divide-y divide-slate-100 text-sm">
          <ProfileRow icon={User} label="Nom complet" value={`${user.prenom} ${user.nom}`} />
          <ProfileRow icon={Mail} label="Email" value={user.email} />
          <ProfileRow icon={Shield} label="Rôle" value={roleLabel} />
          {user.matricule && <ProfileRow label="Matricule" value={user.matricule} />}
          {user.poste && <ProfileRow label="Poste" value={user.poste} />}
          {user.departement && <ProfileRow label="Département" value={user.departement} />}
        </dl>
      </GlassCard>

      {user.employeId ? (
        <GlassCard className="p-5">
          <p className="text-sm text-slate-600">
            Votre compte est lié à une fiche employé BV Groupe.
          </p>
          <Link
            href={`/employes/${user.employeId}`}
            className="mt-3 inline-flex text-sm font-semibold text-[#2F5F9D] hover:text-[#1F3F73]"
          >
            Voir la fiche employé →
          </Link>
        </GlassCard>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => void refreshSession()}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Actualiser la session
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

function ProfileRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  icon?: typeof User;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3.5">
      <dt className="flex items-center gap-2 text-slate-500">
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden /> : null}
        {label}
      </dt>
      <dd className="max-w-[60%] truncate text-right font-medium text-slate-900">{value ?? "—"}</dd>
    </div>
  );
}
