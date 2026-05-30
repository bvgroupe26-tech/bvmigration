"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import OffreForm from "@/components/forms/OffreForm";

export default function NouvelleOffrePage() {
  const router = useRouter();
  return (
    <div className="space-y-5">
      <Link href="/recrutement" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>
      <div>
        <h1 className="font-display text-[28px] font-bold tracking-tight text-slate-900">Nouvelle offre</h1>
        <p className="mt-1 text-sm text-text-secondary">Publiez un nouveau poste à pourvoir.</p>
      </div>
      <GlassCard className="p-6">
        <OffreForm
          onSuccess={() => router.push("/recrutement")}
          onCancel={() => router.push("/recrutement")}
        />
      </GlassCard>
    </div>
  );
}
