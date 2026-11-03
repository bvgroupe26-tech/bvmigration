"use client";

import { use } from "react";
import BudgetSubNav from "@/components/budget/BudgetSubNav";
import DepenseDetail from "@/components/budget/DepenseDetail";

export default function BudgetDepenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="space-y-6">
      <BudgetSubNav />
      <DepenseDetail id={id} backHref="/budget/depenses" />
    </div>
  );
}
