"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Construction, type LucideIcon } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";

type PlaceholderPageProps = {
  title: string;
  description?: string;
  backHref: string;
  backLabel?: string;
  icon?: LucideIcon;
};

export default function PlaceholderPage({
  title,
  description,
  backHref,
  backLabel = "Retour",
  icon: Icon = Construction,
}: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <Link href={backHref}>
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
          {backLabel}
        </Button>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <GlassCard accent="blue" className="p-12 text-center">
          <div className="bv-icon-box mx-auto h-16 w-16">
            <Icon className="h-7 w-7" />
          </div>
          <h2 className="mt-6 font-display text-2xl font-bold text-[#1F3F73]">{title}</h2>
          {description && (
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{description}</p>
          )}
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#2F5F9D]/20 bg-[#E8F0FA] px-4 py-1.5 text-xs font-semibold text-[#1F3F73]">
            <Construction className="h-3.5 w-3.5" />
            Module en cours de finalisation
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
