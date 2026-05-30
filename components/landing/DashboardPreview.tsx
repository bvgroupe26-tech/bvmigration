"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { motion, useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Users, ArrowUpRight } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import type { HeroEmployePreview } from "./HeroSection";

type ChartPoint = { mois: string; presents: number; absents: number };

type DashboardPreviewProps = {
  employePreview?: HeroEmployePreview[];
};

export default function DashboardPreview({ employePreview = [] }: DashboardPreviewProps) {
  const reduce = useReducedMotion();
  const { data: chartData } = useSWR<ChartPoint[]>("/public/presences-chart", fetcher, {
    revalidateOnFocus: false,
    fallbackData: [],
  });

  const chart = useMemo(() => {
    const rows = chartData ?? [];
    return rows.length > 0 ? rows : [{ mois: "…", presents: 0, absents: 0 }];
  }, [chartData]);

  const lastPresents = chartData?.length
    ? chartData[chartData.length - 1]?.presents ?? 0
    : 0;
  const prevPresents =
    chartData && chartData.length > 1 ? chartData[chartData.length - 2]?.presents ?? 0 : 0;
  const deltaPct =
    prevPresents > 0 ? (((lastPresents - prevPresents) / prevPresents) * 100).toFixed(1) : null;

  const rows = employePreview.slice(0, 4);

  return (
    <section id="preview" className="relative overflow-hidden bg-[#0A0F1E] py-28 px-6 lg:px-8">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[1200px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(59,130,246,0.18), rgba(6,182,212,0.08) 60%, transparent 80%)",
          filter: "blur(60px)",
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-14 text-center"
        >
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#2F5F9D]">
            Aperçu de l&apos;interface
          </p>
          <h2 className="mt-2 font-display text-[36px] font-bold tracking-tight text-white sm:text-[48px]">
            Un tableau de bord pensé pour la clarté
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-text-secondary sm:text-lg">
            Données réelles pour le graphique ; aperçu employés issu de votre base locale.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 24 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0E1729]/95 to-[#152038]/95 p-3 sm:p-5 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9),0_0_60px_rgba(59,130,246,0.15)] backdrop-blur-2xl"
        >
          <div className="mb-4 flex items-center gap-2 px-2">
            <span className="h-3 w-3 rounded-full bg-red-400/80" />
            <span className="h-3 w-3 rounded-full bg-amber-400/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
            <div className="ml-3 flex h-7 flex-1 items-center justify-center rounded-md border border-white/5 bg-white/[0.02] px-3 text-[11px] font-mono text-text-tertiary">
              bvgroupe-rh.app/dashboard
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="rounded-2xl border border-white/5 bg-[#0A0F1E]/70 p-5 backdrop-blur lg:col-span-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                    Présences (6 mois)
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <p className="font-mono text-2xl font-bold text-white">{lastPresents}</p>
                    {deltaPct !== null && Number(deltaPct) !== 0 && (
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          Number(deltaPct) >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        <ArrowUpRight className="h-3 w-3" />
                        {Number(deltaPct) >= 0 ? "+" : ""}
                        {deltaPct}%
                      </span>
                    )}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 status-dot-pulse" />
                  Live
                </span>
              </div>
              <div className="mt-4 h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                    <defs>
                      <linearGradient id="preview-grad-presents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="preview-grad-absents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EF4444" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="mois" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} width={32} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(10,15,30,0.95)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 10,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="presents"
                      stroke="#3B82F6"
                      strokeWidth={2.5}
                      fill="url(#preview-grad-presents)"
                      isAnimationActive={!reduce}
                      animationDuration={1200}
                    />
                    <Area
                      type="monotone"
                      dataKey="absents"
                      stroke="#EF4444"
                      strokeWidth={2}
                      fill="url(#preview-grad-absents)"
                      isAnimationActive={!reduce}
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#0A0F1E]/70 p-5 backdrop-blur lg:col-span-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                  Derniers employés
                </p>
                <Users className="h-4 w-4 text-text-tertiary" />
              </div>
              <ul className="mt-4 space-y-2">
                {rows.length === 0 ? (
                  <li className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-text-tertiary">
                    Aucun employé en base
                  </li>
                ) : (
                  rows.map((u, i) => {
                    const name = `${u.prenom} ${u.nom}`;
                    const isConge = u.statut !== "actif";
                    return (
                      <motion.li
                        key={`${name}-${i}`}
                        initial={{ opacity: 0, x: 12 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.15 + i * 0.07 }}
                        className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <UserAvatar name={name} />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-white">{name}</p>
                            <p className="truncate text-[10px] text-text-tertiary">
                              {u.poste ?? "—"} · {u.statut}
                            </p>
                          </div>
                        </div>
                        <span
                          className={
                            isConge
                              ? "inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300"
                              : "inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300"
                          }
                        >
                          <span
                            className={
                              isConge ? "h-1 w-1 rounded-full bg-amber-400" : "h-1 w-1 rounded-full bg-emerald-400"
                            }
                          />
                          {isConge ? "Pause" : "Actif"}
                        </span>
                      </motion.li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function UserAvatar({ name }: { name: string }) {
  const parts = name.split(" ");
  const a = parts[0] ?? "";
  const b = parts[1] ?? "";
  const initials = (a[0] ?? "?") + (b[0] ?? "");
  const gradients = [
    "from-[#2F5F9D] to-[#1F3F73]",
    "from-[#2F5F9D] to-[#1F3F73]",
    "from-emerald-600 to-emerald-500",
    "from-[#F2C94C] to-amber-500",
  ];
  const idx = name.length % gradients.length;
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradients[idx]} text-[10px] font-bold text-white ring-1 ring-white/10`}
    >
      {initials.toUpperCase()}
    </span>
  );
}
