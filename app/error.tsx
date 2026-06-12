"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app]", error);
  }, [error]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#F4F7FB] px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        <h1 className="font-display text-xl font-bold text-slate-900">La page n&apos;a pas pu se charger</h1>
        <p className="mt-2 text-sm text-slate-600">
          Connexion lente, serveur en démarrage ou cache obsolète. Réessayez dans quelques instants.
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
