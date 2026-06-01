"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";
import { TrendingUp, BarChart3 } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import ChartContainer from "@/components/ui/ChartContainer";
import Skeleton from "@/components/ui/Skeleton";
import { useDashboardPresences } from "@/hooks/api";
import { isDailyPresencesChart } from "@/lib/dashboard-utils";

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-lg">
      <p className="font-display text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <div className="mt-1.5 space-y-1">
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-600 capitalize">{p.name}:</span>
            <span className="font-mono font-semibold text-slate-900">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PresenceChart() {
  const { chart, isLoading } = useDashboardPresences();
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  const totalPresents = chart.reduce((acc, c) => acc + c.presents, 0);
  const isEmpty = chart.length === 0 || totalPresents === 0;
  const chartSubtitle = isDailyPresencesChart(chart) ? "30 derniers jours" : "6 derniers mois";

  return (
    <GlassCard className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Évolution des présences
            </h3>
            {!isEmpty && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                <TrendingUp className="h-3 w-3" />
                Live
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-text-secondary">{chartSubtitle}</p>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="mt-5 h-[280px]" />
      ) : isEmpty ? (
        <div className="mt-5 flex h-[280px] flex-col items-center justify-center text-center">
          <BarChart3 className="h-10 w-10 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">Aucune présence enregistrée</p>
          <p className="text-xs text-text-tertiary">
            Enregistrez des présences pour voir l&apos;évolution.
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-5"
        >
          <ChartContainer height={280} minWidth={240}>
            <AreaChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="grad-presents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2F5F9D" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#2F5F9D" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-absents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-retards" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
              <XAxis dataKey="mois" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(59,130,246,0.3)", strokeWidth: 1 }} />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 11, color: "#94A3B8", paddingTop: 8 }}
                formatter={(v) => (
                  <span style={{ color: "#94A3B8" }} className="capitalize ml-1">
                    {v}
                  </span>
                )}
              />
              <Area type="monotone" name="présents" dataKey="presents" stroke="#2F5F9D" strokeWidth={2.5} fill="url(#grad-presents)" animationDuration={900} />
              <Area type="monotone" name="absents" dataKey="absents" stroke="#EF4444" strokeWidth={2} fill="url(#grad-absents)" animationDuration={1100} />
              <Area type="monotone" name="retards" dataKey="retards" stroke="#F59E0B" strokeWidth={2} fill="url(#grad-retards)" animationDuration={1300} />
            </AreaChart>
          </ChartContainer>
        </motion.div>
      )}
    </GlassCard>
  );
}
