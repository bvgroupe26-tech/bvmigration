"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Download, RefreshCw, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import {
  fetchPushStatus,
  sendTestPushNotification,
  syncPushSubscriptionToServer,
} from "@/lib/push-notifications";
import GlassCard from "@/components/ui/GlassCard";

export default function PwaPushSettingsCard() {
  const { isAuthenticated } = useAuth();
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
  const [syncing, setSyncing] = useState(false);
  /** null = vérification en cours */
  const [serverRegistered, setServerRegistered] = useState<boolean | null>(null);
  const [serverUserId, setServerUserId] = useState<number | null>(null);
  const autoSyncDone = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !isSubscribed) {
      setServerRegistered(null);
      autoSyncDone.current = false;
      return;
    }

    let cancelled = false;
    void fetchPushStatus()
      .then((status) => {
        if (!cancelled) {
          setServerUserId(status.userId);
          setServerRegistered(status.subscriptionCount > 0);
        }
      })
      .catch(() => {
        if (!cancelled) setServerRegistered(null);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isSubscribed]);

  useEffect(() => {
    if (
      !isAuthenticated ||
      !isSubscribed ||
      serverRegistered !== false ||
      autoSyncDone.current
    ) {
      return;
    }
    autoSyncDone.current = true;

    void (async () => {
      try {
        await syncPushSubscriptionToServer();
        const status = await fetchPushStatus();
        setServerRegistered(status.subscriptionCount > 0);
        if (status.subscriptionCount > 0) {
          toast.success("Abonnement enregistré sur le serveur — vous pouvez tester la notification.");
        }
      } catch {
        /* bouton manuel ci-dessous */
      }
    })();
  }, [isAuthenticated, isSubscribed, serverRegistered]);

  async function handleSyncToServer() {
    setSyncing(true);
    try {
      await syncPushSubscriptionToServer();
      const status = await fetchPushStatus();
      setServerRegistered(status.subscriptionCount > 0);
      if (status.subscriptionCount > 0) {
        toast.success("Appareil enregistré — retestez la notification.");
      } else {
        toast.error("Échec d'enregistrement — reconnectez-vous puis réessayez.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Synchronisation impossible");
    } finally {
      setSyncing(false);
    }
  }

  async function handleTestPush() {
    setTesting(true);
    try {
      const result = await sendTestPushNotification();
      if (result.message) {
        if (result.sent > 0) toast.success(result.message);
        else toast.error(result.message);
        return;
      }
      if (result.sent > 0) {
        toast.success(
          "Notification test envoyée — fermez l'app et vérifiez la barre de notifications"
        );
      } else if (result.failed > 0) {
        toast.error(
          "Échec d'envoi — vérifiez que NEXT_PUBLIC_VAPID_PUBLIC_KEY (Vercel) = VAPID_PUBLIC_KEY (Render)"
        );
      } else {
        toast.error(
          `Aucun envoi (user #${result.userId ?? "?"}, ${result.subscriptionCount ?? 0} appareil(s) en base)`
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
    if (ok) {
      try {
        const { fetchPushStatus } = await import("@/lib/push-notifications");
        const status = await fetchPushStatus();
        if (status.subscriptionCount === 0) {
          toast.error(
            "Permission accordée mais l'abonnement n'est pas en base — réessayez ou contactez l'admin"
          );
        }
      } catch {
        /* toast succès déjà affiché par subscribe */
      }
      return;
    }
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
              : permission === "granted"
                ? "Permission accordée — finalisez l'enregistrement push sur cet appareil."
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
          {loading
            ? "Finalisation…"
            : permission === "granted"
              ? "Finaliser les notifications"
              : "Activer les notifications"}
        </button>
      ) : serverRegistered === false ? (
        <div className="space-y-2">
          <p className="text-center text-xs font-medium text-amber-800">
            Permission OK sur le téléphone, mais l&apos;appareil n&apos;est pas encore enregistré sur
            le serveur{serverUserId != null ? ` (compte #${serverUserId})` : ""}.
          </p>
          <button
            type="button"
            onClick={() => void handleSyncToServer()}
            disabled={syncing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F5F9D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1F3F73] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Enregistrement…" : "Enregistrer sur le serveur"}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-center text-xs font-medium text-green-700">
            {serverRegistered === null
              ? "Vérification du serveur…"
              : "Notifications activées et enregistrées"}
          </p>
          <button
            type="button"
            onClick={() => void handleTestPush()}
            disabled={testing || serverRegistered !== true}
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
