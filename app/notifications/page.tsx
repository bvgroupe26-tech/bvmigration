"use client";

import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import NotificationList from "@/components/notifications/NotificationList";
import { EmployeeError, EmployeeLoading } from "@/components/employee/EmployeeState";
import { useNotificationsFeed } from "@/hooks/useNotifications";
import { getUserErrorMessage } from "@/lib/utils";

export default function AdminNotificationsPage() {
  const { notifications, unreadCount, isLoading, error, markAsRead, markAllAsRead } =
    useNotificationsFeed();

  async function handleMarkAll() {
    try {
      await markAllAsRead();
      toast.success("Toutes les notifications ont été marquées comme lues");
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <EmployeeLoading />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            {unreadCount > 0 ? `${unreadCount} non lue(s)` : "Tout est à jour"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void handleMarkAll()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#2F5F9D] shadow-sm hover:bg-[#E8F0FA]"
          >
            <CheckCheck className="h-4 w-4" />
            Tout marquer comme lu
          </button>
        )}
      </div>

      {error && <EmployeeError message="Impossible de charger vos notifications." />}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <NotificationList
          notifications={notifications}
          context="admin"
          onMarkRead={markAsRead}
          emptyMessage="Aucune notification RH pour le moment."
        />
      </div>
    </div>
  );
}
