"use client";

import { use } from "react";
import DepenseDetail from "@/components/budget/DepenseDetail";

export default function EmployeeDepenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DepenseDetail id={id} backHref="/employee/depenses" staffView={false} />;
}
