"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmployeeLoading({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-16", className)}>
      <Loader2 className="h-7 w-7 animate-spin text-[#2F5F9D]" />
    </div>
  );
}

export function EmployeeError({ message }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {message ?? "Impossible de charger les données."}
    </div>
  );
}

export function EmployeeEmpty({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F0FA] text-[#2F5F9D]">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="mt-4 font-display text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}
