"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import NotificationList, { NotificationListLink } from "@/components/notifications/NotificationList";
import { useNotificationsFeed } from "@/hooks/useNotifications";
import { cn, getUserErrorMessage } from "@/lib/utils";

type NotificationsBellProps = {
  context: "admin" | "employee";
  className?: string;
  iconClassName?: string;
};

export default function NotificationsBell({
  context,
  className,
  iconClassName,
}: NotificationsBellProps) {
  const [open, setOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotificationsFeed();

  const preview = notifications.slice(0, 8);
  const hasUnread = unreadCount > 0;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleMarkAll() {
    if (!hasUnread) return;
    setMarkingAll(true);
    try {
      await markAllAsRead();
      toast.success("Toutes les notifications ont été marquées comme lues");
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#2F5F9D]/30 hover:bg-[#E8F0FA] hover:text-[#1F3F73]",
          open && "border-[#2F5F9D]/40 bg-[#E8F0FA] text-[#1F3F73]",
          iconClassName
        )}
        aria-label={hasUnread ? `${unreadCount} notification(s) non lue(s)` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-4 w-4" />
        {hasUnread && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[45] bg-slate-900/20 sm:hidden"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Notifications"
            className={cn(
              "z-[46] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10",
              "fixed inset-x-4 bottom-[calc(var(--shell-bottom-nav-height)+env(safe-area-inset-bottom,0px)+0.75rem)] max-h-[min(70dvh,520px)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:w-[min(24rem,calc(100vw-2rem))]"
            )}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="font-display text-sm font-bold text-slate-900">Notifications</h2>
                {hasUnread && (
                  <p className="text-[11px] text-slate-500">{unreadCount} non lue(s)</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {hasUnread && (
                  <button
                    type="button"
                    disabled={markingAll}
                    onClick={() => void handleMarkAll()}
                    className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-[#2F5F9D] hover:bg-[#E8F0FA] disabled:opacity-50"
                    title="Tout marquer comme lu"
                  >
                    {markingAll ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCheck className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline">Tout lu</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 sm:hidden"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[min(52dvh,420px)] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-[#2F5F9D]" />
                </div>
              ) : (
                <NotificationList
                  notifications={preview}
                  context={context}
                  onMarkRead={markAsRead}
                  compact
                />
              )}
            </div>

            <NotificationListLink context={context} />
          </div>
        </>
      )}
    </div>
  );
}
