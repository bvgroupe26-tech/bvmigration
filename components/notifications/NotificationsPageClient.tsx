"use client";

import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import NotificationFilters from "@/components/notifications/NotificationFilters";
import NotificationList from "@/components/notifications/NotificationList";
import { EmployeeError, EmployeeLoading } from "@/components/employee/EmployeeState";
import { useNotificationFilters } from "@/hooks/useNotificationFilters";
import { useNotificationsFeed } from "@/hooks/useNotifications";
import { getUserErrorMessage } from "@/lib/utils";

type NotificationsPageClientProps = {
  context: "admin" | "employee";
  title?: string;
  emptyMessage?: string;
  emptyFilteredMessage?: string;
};

export default function NotificationsPageClient({
  context,
  title = "Notifications",
  emptyMessage = "Aucune notification pour le moment.",
  emptyFilteredMessage = "Aucune notification ne correspond à ces filtres.",
}: NotificationsPageClientProps) {
  const { notifications, unreadCount, isLoading, error, markAsRead, markAllAsRead } =
    useNotificationsFeed();
  const {
    filters,
    filtered,
    counts,
    updateFilters,
    resetFilters,
    hasActiveFilters,
  } = useNotificationFilters(notifications);

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

  if (error) {
    return <EmployeeError message="Impossible de charger vos notifications." />;
  }

  const listEmpty = notifications.length === 0;
  const filteredEmpty = !listEmpty && filtered.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {listEmpty
              ? "Aucune alerte pour le moment"
              : unreadCount > 0
                ? `${unreadCount} non lue(s) · ${filtered.length} affichée(s)`
                : `Tout est à jour · ${filtered.length} affichée(s)`}
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

      {!listEmpty ? (
        <NotificationFilters
          filters={filters}
          counts={counts}
          onChange={updateFilters}
          onReset={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <NotificationList
          notifications={filtered}
          context={context}
          onMarkRead={markAsRead}
          emptyMessage={filteredEmpty ? emptyFilteredMessage : emptyMessage}
        />
      </div>
    </div>
  );
}
