import type { Metadata } from "next";
import { Syne, JetBrains_Mono, DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { TitlebarLayoutShell } from "@/components/Titlebar";
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BV Group RH",
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
        <TitlebarLayoutShell>
          {children}
          <Toaster
            theme="light"
            position="top-right"
            richColors
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
        </TitlebarLayoutShell>
      </body>
    </html>
  );
}
