"use client";

import { useRouter } from "next/navigation";

export default function OfflinePage() {
  const router = useRouter();

  const handleReconnect = () => {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      router.push("/login");
      return;
    }
    window.location.reload();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        <h1 className="font-display text-2xl font-bold text-slate-900">Page inaccessible</h1>
        <p className="mt-2 text-sm text-slate-600">
          Connexion instable, cache non prêt ou page indisponible. Vérifiez le réseau, rechargez, puis reconnectez-vous
          si nécessaire.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleReconnect}
            className="rounded-xl bg-[#1B3A6B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2B5EA7]"
          >
            Se reconnecter
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Recharger
          </button>
        </div>
      </div>
    </main>
  );
}
