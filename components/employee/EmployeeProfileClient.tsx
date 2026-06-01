"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { useEmployeMe, updateEmployeMe } from "@/hooks/employee";
import { useProfilePhoto } from "@/hooks/useProfilePhoto";
import ProfilePhotoEditor from "@/components/profile/ProfilePhotoEditor";
import { EmployeeError, EmployeeLoading } from "@/components/employee/EmployeeState";
import { getUserErrorMessage } from "@/lib/utils";
import { formatDate } from "@/lib/employee/utils";

export default function EmployeeProfileClient() {
  const { employe, isLoading, error, mutate } = useEmployeMe();
  const { photoUrl, uploading, uploadPhoto } = useProfilePhoto();
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (employe) {
      setTelephone(employe.telephone ?? "");
      setAdresse(employe.adresse ?? "");
    }
  }, [employe]);

  if (isLoading) return <EmployeeLoading />;
  if (error) return <EmployeeError message="Impossible de charger votre profil." />;

  async function handleSave() {
    setSaving(true);
    try {
      await updateEmployeMe({ telephone, adresse });
      await mutate();
      toast.success("Profil mis à jour");
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handlePhoto(file: File | undefined) {
    try {
      await uploadPhoto(file);
      await mutate();
      toast.success("Photo de profil mise à jour");
    } catch (err) {
      toast.error(getUserErrorMessage(err, "Impossible d'envoyer la photo."));
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
        <ProfilePhotoEditor
          nom={employe?.nom ?? ""}
          prenom={employe?.prenom}
          photoUrl={photoUrl}
          uploading={uploading}
          onPickFile={handlePhoto}
        />
        <h1 className="mt-4 font-display text-xl font-bold text-slate-900">
          {employe?.prenom} {employe?.nom}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{employe?.email ?? employe?.matricule}</p>
        <p className="mt-2 text-xs text-slate-500">Appuyez sur l&apos;icône appareil photo pour changer votre photo.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Informations RH</p>
        </div>
        <dl className="divide-y divide-slate-100 text-sm">
          <Row label="Matricule" value={employe?.matricule} />
          <Row label="Poste" value={employe?.poste} />
          <Row label="Département" value={employe?.departement} />
          <Row label="Contrat" value={employe?.type_contrat} />
          <Row label="Embauche" value={formatDate(employe?.date_embauche)} />
          {(employe?.date_fin_contrat ?? employe?.dateFinContrat) && (
            <Row
              label="Fin de contrat"
              value={formatDate(employe?.date_fin_contrat ?? employe?.dateFinContrat)}
            />
          )}
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Modifier</p>
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Téléphone</span>
            <input
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Adresse</span>
            <textarea
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#2F5F9D] to-[#1F3F73] px-4 py-3 text-sm font-semibold text-white shadow-md disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="truncate text-right font-medium text-slate-900">{value ?? "—"}</dd>
    </div>
  );
}
