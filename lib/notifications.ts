import { apiGet, apiPut } from "@/lib/apiClient";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarClock,
  FileText,
  Info,
  Settings,
  Wallet,
} from "lucide-react";

export type NotificationType = "info" | "conge" | "paie" | "document" | "systeme";

export type Notification = {
  id: number;
  employe_id: number | null;
  user_id: number | null;
  titre: string;
  message: string;
  type: NotificationType;
  meta: Record<string, unknown> | null;
  lu: boolean;
  lu_at: string | null;
  created_at: string;
};

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickMetaId(meta: Record<string, unknown> | null, ...keys: string[]): number | null {
  if (!meta) return null;
  for (const key of keys) {
    const id = num(meta[key]);
    if (id != null) return id;
  }
  return null;
}

export function normalizeNotification(raw: unknown): Notification {
  const o = rec(raw);
  const metaRaw = o.meta;
  const meta =
    metaRaw && typeof metaRaw === "object" && !Array.isArray(metaRaw)
      ? (metaRaw as Record<string, unknown>)
      : null;

  const type = String(o.type ?? "info") as NotificationType;

  return {
    id: num(o.id) ?? 0,
    employe_id: num(o.employe_id ?? o.employeId),
    user_id: num(o.user_id ?? o.userId),
    titre: String(o.titre ?? ""),
    message: String(o.message ?? ""),
    type: ["info", "conge", "paie", "document", "systeme"].includes(type) ? type : "info",
    meta,
    lu: Boolean(o.lu ?? o.lue),
    lu_at: o.lu_at != null || o.luAt != null ? String(o.lu_at ?? o.luAt) : null,
    created_at: String(o.created_at ?? o.createdAt ?? o.date ?? ""),
  };
}

export function normalizeNotificationList(raw: unknown): Notification[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeNotification).filter((n) => n.id > 0);
}

export function normalizeUnreadCount(raw: unknown): number {
  const o = rec(raw);
  return num(o.count) ?? 0;
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  info: "Information",
  conge: "Congé",
  paie: "Paie",
  document: "Document",
  systeme: "Système",
};

export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, LucideIcon> = {
  info: Info,
  conge: CalendarClock,
  paie: Wallet,
  document: FileText,
  systeme: Settings,
};

export function getNotificationLink(n: Notification, context: "admin" | "employee"): string | null {
  const absenceId = pickMetaId(n.meta, "absenceId", "absence_id");
  const paieId = pickMetaId(n.meta, "paieId", "paie_id");

  if (n.type === "conge") {
    if (context === "employee") return "/employee/leaves";
    return absenceId ? `/presence/absences?highlight=${absenceId}` : "/presence/absences";
  }
  if (n.type === "paie" && paieId) {
    return context === "employee" ? `/employee/paie/${paieId}` : `/paie/${paieId}`;
  }
  if (n.type === "document") {
    return context === "employee" ? "/employee/documents" : null;
  }
  return null;
}

export function formatNotificationDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24) return `Il y a ${diffH} h`;
  if (diffD < 7) return `Il y a ${diffD} j`;

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export const notificationsService = {
  async getMine(): Promise<Notification[]> {
    const raw = await apiGet<unknown>("/notifications/me");
    return normalizeNotificationList(raw);
  },

  async getUnreadCount(): Promise<number> {
    const raw = await apiGet<unknown>("/notifications/me/unread-count");
    return normalizeUnreadCount(raw);
  },

  async markAsRead(id: number): Promise<void> {
    await apiPut(`/notifications/${id}/read`, {});
  },

  async markAllAsRead(): Promise<number> {
    const raw = await apiPut<{ updated?: number }>("/notifications/me/read-all", {});
    const o = rec(raw);
    return num(o.updated) ?? 0;
  },
};
