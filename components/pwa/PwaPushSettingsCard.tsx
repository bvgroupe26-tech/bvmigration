"use client";

import { useState } from "react";
import { Bell, Download, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { sendTestPushNotification } from "@/lib/push-notifications";
import GlassCard from "@/components/ui/GlassCard";

export default function PwaPushSettingsCard() {
  const { openPrompt, isStandalone, canNativeInstall, install, installing } = usePwaInstall();
  const {
    isSupported,
    isSubscribed,
    permission,
    loading,
    needsInstallFirst,
    subscribe,
  } = usePushNotifications();
  const [testing, setTesting] = useState(false);

  async function handleTestPush() {
    setTesting(true);
    try {
      const { sent, failed } = await sendTestPushNotification();
      if (sent > 0) {
        toast.success(
          "Notification test envoyée — fermez l'app et vérifiez la barre de notifications"
        );
      } else if (failed > 0) {
        toast.error(
          "Échec d'envoi — vérifiez que NEXT_PUBLIC_VAPID_PUBLIC_KEY (Vercel) = VAPID_PUBLIC_KEY (Render)"
        );
      } else {
        toast.error(
          "Aucun envoi — réactivez les notifications ou vérifiez VAPID sur Render"
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test push impossible");
    } finally {
      setTesting(false);
    }
  }

  if (!isSupported) {
    return (
      <GlassCard className="p-4">
        <p className="text-sm text-slate-600">
          Les notifications push ne sont pas prises en charge par ce navigateur.
        </p>
      </GlassCard>
    );
  }

  async function handleEnablePush() {
    const ok = await subscribe({ requestPermission: true });
    if (ok) return;
    if (needsInstallFirst) {
      toast.message("Installez d'abord l'application sur l'écran d'accueil.");
      return;
    }
    if (permission === "denied") {
      toast.error("Autorisez les notifications dans les paramètres du navigateur.");
    }
    /* autres erreurs : toast déjà affiché par subscribe */
  }

  return (
    <GlassCard className="space-y-4 p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1F3F73]/10 text-[#1F3F73]">
          <Bell className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-semibold text-slate-900">Application & notifications</h3>
          <p className="mt-1 text-sm text-slate-600">
            {isSubscribed
              ? "Vous recevrez les alertes RH même lorsque l'application est fermée."
              : "Installez l'app et activez les notifications pour ne rien manquer."}
          </p>
        </div>
      </div>

      {!isStandalone ? (
        <button
          type="button"
          onClick={() => {
            if (canNativeInstall) void install();
            else openPrompt();
          }}
          disabled={installing}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#1F3F73] transition hover:bg-slate-50 disabled:opacity-60"
        >
          {canNativeInstall ? (
            <Download className="h-4 w-4" />
          ) : (
            <Smartphone className="h-4 w-4" />
          )}
          {installing ? "Installation…" : "Installer l'application"}
        </button>
      ) : null}

      {!isSubscribed ? (
        <button
          type="button"
          onClick={() => void handleEnablePush()}
          disabled={loading || needsInstallFirst}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F5F9D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1F3F73] disabled:opacity-60"
        >
          <Bell className="h-4 w-4" />
          {loading ? "Activation…" : "Activer les notifications"}
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-center text-xs font-medium text-green-700">Notifications activées</p>
          <button
            type="button"
            onClick={() => void handleTestPush()}
            disabled={testing}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2F5F9D]/30 bg-[#E8F0FA] px-4 py-2.5 text-sm font-semibold text-[#1F3F73] transition hover:bg-[#dbe8f5] disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {testing ? "Envoi…" : "Tester une notification (hors app)"}
          </button>
        </div>
      )}

      {needsInstallFirst ? (
        <p className="text-xs text-amber-800">
          Sur iPhone : installez l&apos;app via Partager → Sur l&apos;écran d&apos;accueil, puis revenez ici.
        </p>
      ) : null}
    </GlassCard>
  );
}
