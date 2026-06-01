"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatFCFA } from "@/lib/utils";
import type { BudgetSynthese } from "@/lib/types";

const CHART_TT = {
  contentStyle: {
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.1)",
    borderRadius: "10px",
    fontSize: "12px",
  },
};

type Props = {
  data: BudgetSynthese["depenses_par_mois"];
};

export default function BudgetMonthlyChart({ data }: Props) {
  return (
    <div className="mt-4 h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#64748b" }}
            interval={1}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
          />
          <Tooltip {...CHART_TT} formatter={(value) => [formatFCFA(Number(value)), ""]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="montant" fill="#6366f1" name="Montant (FCFA)" radius={[4, 4, 0, 0]} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
