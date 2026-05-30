"use client";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        <h1 className="font-display text-2xl font-bold text-slate-900">Mode hors ligne</h1>
        <p className="mt-2 text-sm text-slate-600">
          Vous semblez hors connexion. Vérifiez votre réseau puis rechargez la page.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 rounded-xl bg-[#1B3A6B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2B5EA7]"
        >
          Recharger
        </button>
      </div>
    </main>
  );
}
