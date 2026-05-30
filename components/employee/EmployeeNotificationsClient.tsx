"use client";

import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import NotificationList from "@/components/notifications/NotificationList";
import { useNotificationsFeed } from "@/hooks/useNotifications";
import { EmployeeEmpty, EmployeeError, EmployeeLoading } from "@/components/employee/EmployeeState";
import { Bell } from "lucide-react";
import { getUserErrorMessage } from "@/lib/utils";

export default function EmployeeNotificationsClient() {
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

  if (isLoading) return <EmployeeLoading />;
  if (error) return <EmployeeError message="Impossible de charger vos notifications." />;

  if (notifications.length === 0) {
    return (
      <EmployeeEmpty
        icon={Bell}
        title="Aucune notification"
        description="Vous serez alerté ici des mises à jour RH importantes."
      />
    );
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleMarkAll()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#2F5F9D] shadow-sm"
          >
            <CheckCheck className="h-4 w-4" />
            Tout marquer comme lu
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <NotificationList
          notifications={notifications}
          context="employee"
          onMarkRead={markAsRead}
        />
      </div>
    </div>
  );
}
