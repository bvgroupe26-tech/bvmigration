"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { PieChart as PieIcon } from "lucide-react";
import { useEffect, useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import Skeleton from "@/components/ui/Skeleton";
import { useDashboardDepartements } from "@/hooks/api";

function CustomTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color: string } }>;
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.payload.color }} />
        <span className="font-display text-sm font-semibold text-slate-900">{item.name}</span>
      </div>
      <p className="mt-1 text-xs text-slate-600">
        <span className="font-mono font-semibold text-slate-900">{item.value}</span> personnes ·{" "}
        <span className="font-mono font-semibold text-slate-900">{percent}%</span>
      </p>
    </div>
  );
}

export default function DepartementsDonut() {
  const { repartition, isLoading } = useDashboardDepartements();
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  const safeRepartition = repartition
    .map((d, index) => ({
      ...d,
      name: d.name || `Département ${index + 1}`,
      value: Number.isFinite(d.value) ? d.value : 0,
    }))
    .filter((d) => d.value >= 0);
  const total = safeRepartition.reduce((acc, d) => acc + d.value, 0);

  return (
    <GlassCard className="p-6">
      <div>
        <h3 className="font-display text-base font-semibold text-slate-900">
          Répartition par département
        </h3>
        <p className="mt-0.5 text-xs text-slate-600">
          {total > 0 ? `${total} employés actifs` : "Aucun employé"}
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="mt-4 h-[220px]" />
      ) : safeRepartition.length === 0 ? (
        <div className="mt-4 flex h-[220px] flex-col items-center justify-center text-center">
          <PieIcon className="h-10 w-10 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">Aucun employé en base</p>
        </div>
      ) : isClient ? (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
          <div className="relative h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={180} minHeight={220}>
              <PieChart>
                <Tooltip content={<CustomTooltip total={total} />} />
                <Pie
                  data={safeRepartition}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={88}
                  paddingAngle={3}
                  stroke="#fff"
                  strokeWidth={2}
                  animationDuration={900}
                  animationBegin={150}
                >
                  {safeRepartition.map((entry, idx) => (
                    <Cell key={`${entry.name}-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-3xl font-bold text-slate-900">{total}</span>
              <span className="text-[10px] uppercase tracking-widest text-slate-500">
                Employés
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {safeRepartition.map((d, i) => {
              const percent = total > 0 ? ((d.value / total) * 100).toFixed(0) : "0";
              return (
                <motion.div
                  key={d.name}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} />
                    <span className="truncate text-slate-600">{d.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono font-semibold text-slate-900">{d.value}</span>
                    <span className="font-mono text-[10px] text-slate-500">{percent}%</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        <Skeleton className="mt-4 h-[220px]" />
      )}
    </GlassCard>
  );
}
