"use client";

import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";
import { formatFCFA } from "@/lib/utils";
import ChartContainer from "@/components/ui/ChartContainer";
import type { SyntheseFinance } from "@/lib/types-finance";

const CHART_TT = {
  contentStyle: {
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.1)",
    borderRadius: "10px",
    fontSize: "12px",
  },
};

type Props = {
  data: SyntheseFinance["depenses_par_mois"];
};

function compact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${Math.round(v / 100_000) / 10} M`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)} k`;
  return String(v);
}

export default function BudgetMonthlyChart({ data }: Props) {
  return (
    <ChartContainer height={280} className="mt-4">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => compact(Number(v))}
          width={48}
        />
        <Tooltip {...CHART_TT} formatter={(value, name) => [formatFCFA(Number(value)), String(name)]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="realise" stackId="m" fill="#1F3F73" name="Réalisé (payé)" />
        <Bar dataKey="engage" stackId="m" fill="#93b4e0" name="Engagé (validé)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
