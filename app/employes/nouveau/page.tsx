"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import EmployeForm from "@/components/forms/EmployeForm";

export default function NouvelEmployePage() {
  const router = useRouter();
  return (
    <div className="space-y-5">
      <Link href="/employes" className="inline-flex items-center gap-2 text-sm text-text-secondary transition hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Retour aux employés
      </Link>
      <div>
        <h1 className="font-display text-[28px] font-bold tracking-tight text-slate-900">
          Nouvel employé
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Ajoutez un nouveau membre à l&apos;équipe BV GROUPE.
        </p>
      </div>
      <GlassCard className="p-6">
        <EmployeForm
          onSuccess={(e) => {
            if (e?.id && e.id > 0) {
              router.push(`/employes/${e.id}`);
              return;
            }
            router.push("/employes");
          }}
          onCancel={() => router.push("/employes")}
        />
      </GlassCard>
    </div>
  );
}
