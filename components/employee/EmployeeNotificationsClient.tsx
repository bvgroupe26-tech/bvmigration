"use client";

import NotificationsPageClient from "@/components/notifications/NotificationsPageClient";

export default function EmployeeNotificationsClient() {
  return (
    <NotificationsPageClient
      context="employee"
      emptyMessage="Vous serez alerté ici des mises à jour RH importantes."
      emptyFilteredMessage="Aucune notification pour ces filtres. Modifiez le type ou la période."
    />
  );
}
