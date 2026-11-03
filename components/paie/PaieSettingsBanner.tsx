"use client";

import Link from "next/link";
import { AlertTriangle, Settings } from "lucide-react";
import type { PaieSettingsStatut } from "@/lib/types-paie";

const EMPLOYEUR_LABELS: Record<string, string> = {
  raisonSociale: "raison sociale",
  adresse: "adresse",
  ville: "ville",
  niu: "NIU",
  rccm: "RCCM",
  numeroCnssEmployeur: "n° CNSS employeur",
};

type Props = {
  statut: PaieSettingsStatut | undefined;
  unavailable?: boolean;
};

export default function PaieSettingsBanner({ statut, unavailable }: Props) {
  if (statut?.pret) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div className="min-w-0 text-sm text-amber-900">
          <p className="font-semibold">Paramétrage de la paie incomplet</p>
          {unavailable || !statut ? (
            <p className="mt-1 text-amber-800">
              Le nouveau moteur de paie n&apos;est pas encore disponible. Utilisez l&apos;onglet « Bulletins (ancien calcul) ».
            </p>
          ) : (
            <>
              <p className="mt-1 text-amber-800">
                Le calcul par rubriques est bloqué tant que les éléments ci-dessous ne sont pas renseignés. L&apos;ancien
                calcul reste utilisable.
              </p>
              {statut.parametresManquants.length > 0 && (
                <p className="mt-2 text-xs">
                  <span className="font-semibold">Paramètres à saisir :</span>{" "}
                  <span className="font-mono">{statut.parametresManquants.join(", ")}</span>
                </p>
              )}
              {statut.employeurIncomplet.length > 0 && (
                <p className="mt-1 text-xs">
                  <span className="font-semibold">Fiche employeur :</span>{" "}
                  {statut.employeurIncomplet.map((c) => EMPLOYEUR_LABELS[c] ?? c).join(", ")}
                </p>
              )}
            </>
          )}
        </div>
      </div>
      <Link
        href="/parametres/paie"
        className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
      >
        <Settings className="h-4 w-4" />
        Paramètres de paie
      </Link>
    </div>
  );
}
