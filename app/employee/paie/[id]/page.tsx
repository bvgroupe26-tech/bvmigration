import { Suspense } from "react";
import EmployeeBulletinView from "@/components/paie/EmployeeBulletinView";
import { EmployeeLoading } from "@/components/employee/EmployeeState";

export default function EmployeePayslipPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<EmployeeLoading />}>
      <EmployeeBulletinView params={params} />
    </Suspense>
  );
}
