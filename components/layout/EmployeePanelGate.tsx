"use client";

import { EmployeePanelProvider } from "@/components/EmployeeDetailPanel";

export default function EmployeePanelGate({ children }: { children: React.ReactNode }) {
  return <EmployeePanelProvider>{children}</EmployeePanelProvider>;
}
