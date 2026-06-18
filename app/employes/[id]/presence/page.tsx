import AdminEmployeePresencesClient from "@/components/presence/AdminEmployeePresencesClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EmployePresencePage({ params }: PageProps) {
  const { id } = await params;
  const employeId = Number(id);
  if (!Number.isFinite(employeId) || employeId <= 0) {
    return null;
  }
  return (
    <AdminEmployeePresencesClient
      employeId={employeId}
      backHref="/employes"
      backLabel="Retour aux employés"
    />
  );
}
