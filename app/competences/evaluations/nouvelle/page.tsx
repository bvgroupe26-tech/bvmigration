"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import EvaluationForm from "@/components/forms/EvaluationForm";

export default function NouvelleEvaluationPage() {
  const router = useRouter();
  return (
    <div className="space-y-5">
      <Link href="/competences/evaluations" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>
      <div>
        <h1 className="font-display text-[28px] font-bold tracking-tight text-slate-900">Nouvelle évaluation</h1>
        <p className="mt-1 text-sm text-text-secondary">Évaluer un collaborateur sur 4 critères.</p>
      </div>
      <GlassCard className="p-6">
        <EvaluationForm
          onSuccess={() => router.push("/competences/evaluations")}
          onCancel={() => router.push("/competences/evaluations")}
        />
      </GlassCard>
    </div>
  );
}
