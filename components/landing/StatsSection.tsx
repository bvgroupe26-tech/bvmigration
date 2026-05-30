"use client";

import useSWR from "swr";
import { motion } from "framer-motion";
import { Users, CheckCircle2, Wallet, Briefcase, type LucideIcon } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { normalizePublicStats } from "@/lib/public-utils";
import AnimatedCounter from "./AnimatedCounter";

type PublicStats = {
  total_employes: number;
  presents_aujourd_hui: number;
  masse_salariale: number;
  recrutements_ouverts: number;
  total_candidats: number;
  satisfaction: number;
};

type Card = {
  label: string;
  value: number;
  icon: LucideIcon;
  format?: "number" | "currency";
  iconBg: string;
  iconText: string;
  borderColor: string;
  glow: string;
};

export default function StatsSection({ initial }: { initial?: PublicStats }) {
  const { data } = useSWR<PublicStats>("/public/stats", async () => normalizePublicStats(await fetcher<unknown>("/public/stats")), {
    refreshInterval: 30_000,
    fallbackData: initial,
  });
  const stats = data ?? initial ?? {
    total_employes: 0,
    presents_aujourd_hui: 0,
    masse_salariale: 0,
    recrutements_ouverts: 0,
    total_candidats: 0,
    satisfaction: 0,
  };

  const cards: Card[] = [
    {
      label: "Total Employés",
      value: stats.total_employes,
      icon: Users,
      iconBg: "bg-gradient-to-br from-[#2F5F9D]/20 to-[#2F5F9D]/5",
      iconText: "text-[#2F5F9D]/80",
      borderColor: "after:bg-[#2F5F9D]",
      glow: "shadow-[0_18px_60px_-25px_rgba(59,130,246,0.6)]",
    },
    {
      label: "Présents aujourd'hui",
      value: stats.presents_aujourd_hui,
      icon: CheckCircle2,
      iconBg: "bg-gradient-to-br from-emerald-500/30 to-emerald-500/10",
      iconText: "text-emerald-300",
      borderColor: "after:bg-emerald-500",
      glow: "shadow-[0_18px_60px_-25px_rgba(16,185,129,0.6)]",
    },
    {
      label: "Masse salariale",
      value: stats.masse_salariale,
      icon: Wallet,
      format: "currency",
      iconBg: "bg-gradient-to-br from-[#2F5F9D]/15 to-[#1F3F73]/5",
      iconText: "text-[#2F5F9D]",
      borderColor: "after:bg-[#2F5F9D]",
      glow: "shadow-[0_18px_60px_-25px_rgba(6,182,212,0.6)]",
    },
    {
      label: "Recrutements ouverts",
      value: stats.recrutements_ouverts,
      icon: Briefcase,
      iconBg: "bg-gradient-to-br from-[#1F3F73]/15 to-[#1F3F73]/5",
      iconText: "text-[#1F3F73]",
      borderColor: "after:bg-[#1F3F73]",
      glow: "shadow-[0_18px_60px_-25px_rgba(139,92,246,0.6)]",
    },
  ];

  return (
    <section id="stats" className="relative bg-[#111827] py-24 px-6 lg:px-8">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#2F5F9D]">
            Statistiques en temps réel
          </p>
          <h2 className="mt-2 font-display text-[32px] font-bold tracking-tight text-white sm:text-[40px]">
            Votre activité en un coup d&apos;œil
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-text-secondary">
            Toutes ces données proviennent directement de votre base SQLite et sont mises à jour automatiquement.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15 } } }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {cards.map((c) => (
            <motion.div
              key={c.label}
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
              }}
              className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-6 backdrop-blur-xl transition hover:bg-white/[0.05] hover:border-white/15 ${c.glow} after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] ${c.borderColor}`}
            >
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  {c.label}
                </p>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.iconBg} ring-1 ring-white/10`}>
                  <c.icon className={`h-5 w-5 ${c.iconText}`} strokeWidth={2.2} />
                </div>
              </div>
              <div className="mt-4">
                <AnimatedCounter
                  to={c.value}
                  format={c.format}
                  className="font-mono text-[40px] font-bold leading-none tracking-tight text-white"
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
