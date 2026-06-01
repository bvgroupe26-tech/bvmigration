"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";

export default function BudgetError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[budget]", error);
  }, [error]);

  return (
    <main className="flex min-h-[50vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        <h1 className="font-display text-xl font-bold text-slate-900">Module budget indisponible</h1>
        <p className="mt-2 text-sm text-slate-600">
          Le chargement a échoué (réseau lent, cache obsolète ou API indisponible). Rechargez la page ou réessayez.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="primary" onClick={() => reset()}>
            Réessayer
          </Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Recharger
          </Button>
        </div>
      </div>
    </main>
  );
}
