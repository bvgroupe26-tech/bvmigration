import { Suspense } from "react";
import EmployeePayslipClient from "@/components/employee/EmployeePayslipClient";
import { EmployeeLoading } from "@/components/employee/EmployeeState";

export default function EmployeePayslipPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<EmployeeLoading />}>
      <EmployeePayslipClient params={params} />
    </Suspense>
  );
}
