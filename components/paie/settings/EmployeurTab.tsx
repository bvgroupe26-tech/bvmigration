"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import Skeleton from "@/components/ui/Skeleton";
import { Field, Input } from "@/components/ui/Field";
import { useEmployeurSettings } from "@/hooks/paie";
import { apiClient, getUserErrorMessage } from "@/lib/fetcher";
import type { EmployeurSettings } from "@/lib/types-paie";

const FIELDS: Array<{ name: keyof EmployeurSettings; label: string; required?: boolean; mono?: boolean }> = [
  { name: "raisonSociale", label: "Raison sociale", required: true },
  { name: "adresse", label: "Adresse", required: true },
  { name: "ville", label: "Ville", required: true },
  { name: "telephone", label: "Téléphone" },
  { name: "email", label: "E-mail" },
  { name: "niu", label: "NIU", required: true, mono: true },
  { name: "rccm", label: "RCCM", required: true, mono: true },
  { name: "numeroCnssEmployeur", label: "N° CNSS employeur", required: true, mono: true },
  { name: "conventionCollective", label: "Convention collective" },
  { name: "logoUrl", label: "URL du logo" },
];

const EMPTY: EmployeurSettings = {
  raisonSociale: null,
  adresse: null,
  ville: null,
  telephone: null,
  email: null,
  niu: null,
  rccm: null,
  numeroCnssEmployeur: null,
  logoUrl: null,
  conventionCollective: null,
};

export default function EmployeurTab({ canWrite, onSaved }: { canWrite: boolean; onSaved: () => void }) {
  const { employeur, isLoading, mutate } = useEmployeurSettings();
  const [form, setForm] = useState<EmployeurSettings>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (employeur) setForm(employeur);
  }, [employeur]);

  async function save() {
    setSaving(true);
    try {
      const body = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? null : v])
      );
      await apiClient.put("/paie-settings/employeur", body);
      toast.success("Fiche employeur enregistrée");
      await mutate();
      onSaved();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <GlassCard className="p-6">
      <p className="text-sm text-text-secondary">
        Ces mentions figurent en en-tête de chaque bulletin. Elles sont figées sur le bulletin au moment de sa validation.
      </p>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <Field key={f.name} label={f.label} required={f.required}>
            <Input
              value={form[f.name] ?? ""}
              disabled={!canWrite}
              className={f.mono ? "font-mono" : undefined}
              onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
            />
          </Field>
        ))}
      </div>
      {canWrite && (
        <div className="mt-6 flex justify-end">
          <Button variant="primary" icon={<Save className="h-4 w-4" />} onClick={save} loading={saving}>
            Enregistrer
          </Button>
        </div>
      )}
    </GlassCard>
  );
}
