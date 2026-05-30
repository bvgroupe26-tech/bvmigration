import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { resolveApiBaseUrl } from "@/lib/resolve-api-url";
import { getHomeRouteByRole } from "@/lib/session";
import FloatingBlobs from "@/components/landing/FloatingBlobs";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import DashboardPreview from "@/components/landing/DashboardPreview";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import { normalizePublicStats } from "@/lib/public-utils";
import { normalizePresencesChart } from "@/lib/dashboard-utils";

export const dynamic = "force-dynamic";

const API_URL = resolveApiBaseUrl();

export type PublicStats = {
  total_employes: number;
  presents_aujourd_hui: number;
  masse_salariale: number;
  recrutements_ouverts: number;
  total_candidats: number;
  satisfaction: number;
};

export type LandingEmployePreview = {
  nom: string;
  prenom: string;
  poste: string | null;
  statut: string;
};

export type LandingPresencePoint = {
  mois: string;
  presents: number;
  absents: number;
};

async function fetchWithTimeout(url: string, timeoutMs = 3000): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: "no-store", signal: controller.signal });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPublicStats(): Promise<PublicStats> {
  const empty: PublicStats = {
    total_employes: 0,
    presents_aujourd_hui: 0,
    masse_salariale: 0,
    recrutements_ouverts: 0,
    total_candidats: 0,
    satisfaction: 0,
  };
  try {
    const res = await fetchWithTimeout(`${API_URL}/public/stats`);
    if (!res || !res.ok) return empty;
    const json = await res.json();
    const data = json?.data ?? json;
    return normalizePublicStats(data);
  } catch {
    return empty;
  }
}

async function fetchPublicPresencesChart(): Promise<LandingPresencePoint[]> {
  try {
    const res = await fetchWithTimeout(`${API_URL}/public/presences-chart`);
    if (!res || !res.ok) return [];
    const json = await res.json();
    const data = json?.data ?? json;
    return normalizePresencesChart(data).map((p) => ({
      mois: p.mois,
      presents: p.presents,
      absents: p.absents,
    }));
  } catch {
    return [];
  }
}

async function fetchEmployePreview(): Promise<LandingEmployePreview[]> {
  try {
    const res = await fetchWithTimeout(`${API_URL}/public/employes-preview`);
    if (!res || !res.ok) return [];
    const json = await res.json();
    const data = json?.data ?? json;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  // Si déjà connecté -> redirect vers route par rôle
  const session = await getSession();
  if (session) redirect(getHomeRouteByRole(session.role));

  const [stats, presenceChart, employePreview] = await Promise.all([
    fetchPublicStats(),
    fetchPublicPresencesChart(),
    fetchEmployePreview(),
  ]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0A0F1E] text-text-primary">
      {/* Blobs animés en fond du hero */}
      <div className="absolute inset-x-0 top-0 h-screen">
        <FloatingBlobs variant="hero" />
      </div>

      <Navbar />
      <main className="relative">
        <HeroSection publicStats={stats} employePreview={employePreview} presenceChart={presenceChart} />
        <StatsSection initial={stats} />
        <FeaturesSection />
        <DashboardPreview employePreview={employePreview} />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
