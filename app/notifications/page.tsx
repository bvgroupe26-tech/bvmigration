"use client";

import NotificationsPageClient from "@/components/notifications/NotificationsPageClient";

export default function AdminNotificationsPage() {
  return (
    <NotificationsPageClient
      context="admin"
      emptyMessage="Aucune notification RH pour le moment."
      emptyFilteredMessage="Aucune notification ne correspond à ces filtres. Essayez « Toutes » ou une autre période."
    />
  );
}
