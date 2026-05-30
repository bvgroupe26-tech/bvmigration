"use client";

import { Bell } from "lucide-react";
import { toast } from "sonner";
import { useMyNotifications, markNotificationRead } from "@/hooks/employee";
import { formatDate, isNotificationRead } from "@/lib/employee/utils";
import { EmployeeEmpty, EmployeeError, EmployeeLoading } from "@/components/employee/EmployeeState";
import {cn, getUserErrorMessage } from "@/lib/utils";

export default function EmployeeNotificationsClient() {
  const { notifications, isLoading, error, mutate } = useMyNotifications();

  async function handleMarkRead(id: number) {
    try {
      await markNotificationRead(id);
      await mutate();
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
    <div className="space-y-2">
      {notifications.map((n) => {
        const read = isNotificationRead(n);
        return (
          <article
            key={n.id}
            className={cn(
              "rounded-2xl border bg-white p-4 shadow-sm",
              read ? "border-slate-200" : "border-[#2F5F9D]/30 ring-1 ring-[#2F5F9D]/10"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{n.titre}</p>
                <p className="mt-1 text-sm text-slate-600">{n.message}</p>
                <p className="mt-2 text-[11px] text-slate-400">
                  {formatDate(n.created_at ?? n.date)}
                </p>
              </div>
              {!read && (
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#2F5F9D]" />
              )}
            </div>
            {!read && (
              <button
                type="button"
                onClick={() => handleMarkRead(n.id)}
                className="mt-3 text-xs font-semibold text-[#2F5F9D]"
              >
                Marquer comme lu
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}
