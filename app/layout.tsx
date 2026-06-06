import type { Metadata } from "next";
import { Syne, JetBrains_Mono, DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { TitlebarLayoutShell } from "@/components/Titlebar";
import { AuthProvider } from "@/context/AuthContext";
import { PwaInstallProvider } from "@/context/PwaInstallContext";
import SessionKeeper from "@/components/auth/SessionKeeper";
import PushNotificationsRoot from "@/components/push/PushNotificationsRoot";
import PushNotificationClickHandler from "@/components/push/PushNotificationClickHandler";
import { PushNotificationsProvider } from "@/hooks/usePushNotifications";
import ChunkLoadRecovery from "@/components/pwa/ChunkLoadRecovery";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";
import { SwrOfflineConfig } from "@/components/pwa/SwrOfflineConfig";
import OfflineBanner from "@/components/pwa/OfflineBanner";
import PwaServiceWorkerBootstrap from "@/components/pwa/PwaServiceWorkerBootstrap";
import SyncOnReconnect from "@/components/pwa/SyncOnReconnect";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BV GROUPE — Gestion RH",
  description:
    "Plateforme moderne de gestion des ressources humaines : employés, paie, présences, recrutement, compétences.",
  manifest: "/manifest.webmanifest",
  applicationName: "BV Groupe RH",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BV Groupe RH",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#1F3F73",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen bg-slate-100 font-sans text-text-primary antialiased"
        suppressHydrationWarning
      >
        <OfflineBanner />
        <PwaServiceWorkerBootstrap />
        <PwaInstallProvider>
          <AuthProvider>
            <PushNotificationsProvider>
              <SwrOfflineConfig>
                <SyncOnReconnect />
                <SessionKeeper />
                <PushNotificationClickHandler />
                <TitlebarLayoutShell>
                  <ChunkLoadRecovery />
                  <PushNotificationsRoot />
                  {children}
                </TitlebarLayoutShell>
              </SwrOfflineConfig>
            </PushNotificationsProvider>
          </AuthProvider>
          <PwaInstallPrompt />
          <Toaster
            theme="light"
            position="bottom-center"
            richColors
            offset={16}
            mobileOffset={{ bottom: "calc(var(--shell-bottom-nav-height, 4rem) + env(safe-area-inset-bottom, 0px) + 0.5rem)" }}
            toastOptions={{
              style: {
                background: "#ffffff",
                border: "1px solid rgba(15,23,42,0.1)",
                color: "#0f172a",
                boxShadow: "0 10px 40px rgba(15,23,42,0.08)",
              },
              className: "font-sans",
            }}
          />
        </PwaInstallProvider>
      </body>
    </html>
  );
}
