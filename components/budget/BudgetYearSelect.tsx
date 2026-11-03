"use client";

import { NativeSelect } from "@/components/ui/Field";

type Props = {
  value: number;
  onChange: (annee: number) => void;
  label?: string;
};

export default function BudgetYearSelect({ value, onChange, label = "Exercice" }: Props) {
  const current = new Date().getFullYear();
  const years = Array.from(new Set([current + 1, current, current - 1, current - 2, current - 3, value])).sort(
    (a, b) => b - a
  );
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
      {label}
      <NativeSelect
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-10 w-28 font-mono"
        aria-label={label}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}
