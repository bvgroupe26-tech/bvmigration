"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Area, AreaChart, Tooltip } from "recharts";
import GlassCard from "./GlassCard";
import ChartContainer from "./ChartContainer";
import { cn, formatFCFA, formatNumber, formatPercent } from "@/lib/utils";

export type KPIColor = "blue" | "green" | "cyan" | "amber" | "red" | "violet";

type KPICardProps = {
  title: string;
  value: number;
  icon: LucideIcon;
  color: KPIColor;
  trend?: { value: number; isPositive: boolean };
  sparklineData?: number[];
  format?: "number" | "currency" | "percent";
  suffix?: string;
  index?: number;
  onClick?: () => void;
};

const COLOR_THEMES: Record<
  KPIColor,
  {
    accent: "blue" | "green" | "cyan" | "amber" | "red" | "violet";
    iconBg: string;
    iconText: string;
    sparkStroke: string;
    sparkFill: string;
    gradId: string;
  }
> = {
  blue: {
    accent: "blue",
    iconBg: "bg-[#E8F0FA] border border-[#2F5F9D]/15",
    iconText: "text-[#2F5F9D]",
    sparkStroke: "#2F5F9D",
    sparkFill: "rgba(47,95,157,0.15)",
    gradId: "kpi-grad-blue",
  },
  green: {
    accent: "green",
    iconBg: "bg-emerald-50 border border-emerald-200/80",
    iconText: "text-emerald-700",
    sparkStroke: "#047857",
    sparkFill: "rgba(4,120,87,0.12)",
    gradId: "kpi-grad-green",
  },
  cyan: {
    accent: "blue",
    iconBg: "bg-[#E8F0FA] border border-[#1F3F73]/15",
    iconText: "text-[#1F3F73]",
    sparkStroke: "#1F3F73",
    sparkFill: "rgba(31,63,115,0.12)",
    gradId: "kpi-grad-navy",
  },
  amber: {
    accent: "amber",
    iconBg: "bg-[#FEF9E7] border border-[#F2C94C]/40",
    iconText: "text-[#92710C]",
    sparkStroke: "#B45309",
    sparkFill: "rgba(242,201,76,0.2)",
    gradId: "kpi-grad-gold",
  },
  red: {
    accent: "red",
    iconBg: "bg-red-50 border border-red-200/80",
    iconText: "text-red-700",
    sparkStroke: "#B91C1C",
    sparkFill: "rgba(185,28,28,0.1)",
    gradId: "kpi-grad-red",
  },
  violet: {
    accent: "blue",
    iconBg: "bg-[#E8F0FA] border border-[#2F5F9D]/15",
    iconText: "text-[#2F5F9D]",
    sparkStroke: "#2F5F9D",
    sparkFill: "rgba(47,95,157,0.15)",
    gradId: "kpi-grad-violet",
  },
};

function AnimatedCounter({
  to,
  format,
  suffix,
}: {
  to: number;
  format: KPICardProps["format"];
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -50px 0px" });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { duration: 1400, bounce: 0 });
  const display = useTransform(spring, (latest) => {
    if (format === "currency") return formatFCFA(latest);
    if (format === "percent") return formatPercent(latest);
    return formatNumber(Math.round(latest));
  });
  const [text, setText] = useState<string>(() => {
    if (format === "currency") return formatFCFA(0);
    if (format === "percent") return formatPercent(0);
    return "0";
  });

  useEffect(() => {
    if (inView) {
      motionVal.set(to);
    }
  }, [inView, motionVal, to]);

  useEffect(() => {
    const unsub = display.on("change", (v) => setText(v));
    return () => unsub();
  }, [display]);

  return (
    <span
      ref={ref}
      className="inline-flex max-w-full items-end gap-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[28px] font-bold leading-[1.1] tracking-tight text-slate-900 tabular-nums sm:text-[32px]"
    >
      {text}
      {suffix && <span className="text-sm font-medium text-slate-500">{suffix}</span>}
    </span>
  );
}

function SparkTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (!active || !payload?.length) return null;
  const value = Number.isFinite(payload[0].value) ? payload[0].value : 0;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-mono text-slate-800 shadow-lg">
      {formatNumber(value)}
    </div>
  );
}

export default function KPICard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  sparklineData,
  format = "number",
  suffix,
  index = 0,
  onClick,
}: KPICardProps) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  const theme = COLOR_THEMES[color];
  const safeValue = Number.isFinite(value) ? value : 0;
  const safeTrendValue = Number.isFinite(trend?.value) ? trend?.value ?? 0 : 0;
  const data = useMemo(
    () =>
      (sparklineData ?? []).map((v, i) => ({
        idx: i,
        value: Number.isFinite(v) ? v : 0,
      })),
    [sparklineData]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      {...(onClick && {
        role: "button",
        tabIndex: 0,
        onClick,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        },
      })}
      className={onClick ? "cursor-pointer" : undefined}
    >
      <GlassCard
        accent={theme.accent}
        className={cn("p-5", onClick && "transition hover:-translate-y-0.5 hover:shadow-lg")}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
              {title}
            </p>
            <div className="mt-2.5">
              <AnimatedCounter to={safeValue} format={format} suffix={suffix} />
            </div>
            {trend && (
              <div
                className={cn(
                  "mt-2 inline-flex items-center gap-1 text-xs font-semibold",
                  trend.isPositive ? "text-emerald-700" : "text-red-600"
                )}
              >
                {trend.isPositive ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                <span className="font-mono">{Math.abs(safeTrendValue).toFixed(1)}%</span>
                <span className="font-normal text-text-tertiary">vs mois dernier</span>
              </div>
            )}
          </div>
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", theme.iconBg)}>
            <Icon className={cn("h-5 w-5", theme.iconText)} strokeWidth={2} />
          </div>
        </div>

        {isClient && data.length > 0 && (
          <ChartContainer height={48} minWidth={120} className="mt-3 -mx-1">
            <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={theme.gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={theme.sparkStroke} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={theme.sparkStroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={theme.sparkStroke}
                  strokeWidth={2}
                  fill={`url(#${theme.gradId})`}
                  isAnimationActive
                  animationDuration={1100}
                />
                <Tooltip content={<SparkTooltip />} cursor={false} />
              </AreaChart>
          </ChartContainer>
        )}
      </GlassCard>
    </motion.div>
  );
}
