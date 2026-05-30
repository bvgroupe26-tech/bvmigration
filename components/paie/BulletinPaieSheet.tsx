import Avatar from "@/components/ui/Avatar";
import StatBadge from "@/components/ui/StatBadge";
import { formatMoisPaie, formatReferenceBulletin } from "@/lib/absence-utils";
import { formatProrata } from "@/lib/paie-utils";
import type { Paie } from "@/lib/types";
import { cn } from "@/lib/utils";

type BulletinPaieSheetProps = {
  bulletin: Paie;
  showStatutBadge?: boolean;
  className?: string;
  id?: string;
};

export default function BulletinPaieSheet({
  bulletin,
  showStatutBadge = true,
  className,
  id = "bulletin-paie-feuille",
}: BulletinPaieSheetProps) {
  const totalPrimes =
    bulletin.prime_transport +
    bulletin.prime_logement +
    bulletin.prime_performance +
    bulletin.autres_primes;
  const totalRetenues = bulletin.cnss + bulletin.impot + bulletin.autres_retenues;
  const brut = bulletin.salaire_base + totalPrimes;
  const moisLabel = formatMoisPaie(String(bulletin.mois), bulletin.annee);
  const prorataLabel = formatProrata(bulletin);
  const matricule = `EMP-${String(bulletin.employe_id).padStart(5, "0")}`;
  const datePaiement = bulletin.date_paiement
    ? new Date(bulletin.date_paiement.includes("T") ? bulletin.date_paiement : `${bulletin.date_paiement}T12:00:00`).toLocaleDateString("fr-FR")
    : null;

  return (
    <article
      id={id}
      className={cn(
        "bulletin-print-root overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none",
        className
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 print:px-0 print:py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">BV Groupe</p>
          <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 print:text-2xl">
            Bulletin de paie
          </h1>
          <p className="mt-1 max-w-md text-xs text-slate-600">
            Document confidentiel — à conserver par l&apos;employé et le service paie.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Période de paie</p>
          <p className="font-display text-lg font-bold text-slate-900">{moisLabel}</p>
          {prorataLabel && <p className="mt-1 text-xs font-medium text-amber-800">{prorataLabel}</p>}
          {showStatutBadge && (
            <div className="mt-2 flex justify-end print:hidden">
              <StatBadge variant={bulletin.statut}>{bulletin.statut.replace("_", " ")}</StatBadge>
            </div>
          )}
          <p className="mt-2 hidden text-xs font-medium uppercase tracking-wide text-slate-600 print:block">
            Statut : {bulletin.statut.replace("_", " ")}
          </p>
        </div>
      </header>

      <section className="border-b border-slate-100 px-6 py-5 print:px-0 print:py-4">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar nom={bulletin.employe_nom ?? "?"} prenom={bulletin.employe_prenom ?? ""} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-lg font-bold text-slate-900">
              {bulletin.employe_prenom} {bulletin.employe_nom}
            </h2>
            <dl className="mt-2 grid grid-cols-1 gap-x-8 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
              <div className="flex gap-2">
                <dt className="shrink-0 text-slate-500">Matricule</dt>
                <dd className="font-mono text-slate-900">{matricule}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 text-slate-500">Poste</dt>
                <dd className="text-slate-900">{bulletin.employe_poste ?? "—"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="px-6 py-5 print:px-0 print:py-4">
        <div className="overflow-x-auto rounded-xl border border-slate-200 print:border-slate-300">
          <table className="bulletin-pro-table w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600 print:bg-white">
                <th className="border-b border-slate-200 px-4 py-3">Libellé</th>
                <th className="border-b border-slate-200 px-4 py-3 text-right">Montant (FCFA)</th>
                <th className="hidden border-b border-slate-200 px-4 py-3 text-center print:table-cell sm:table-cell">
                  Sens
                </th>
              </tr>
            </thead>
            <tbody className="text-slate-800">
              {prorataLabel && (
                <tr className="bg-amber-50/80 text-amber-900">
                  <td className="border-b border-slate-100 px-4 py-2.5 text-xs font-medium">{prorataLabel}</td>
                  <td className="border-b border-slate-100 px-4 py-2.5 text-right font-mono text-xs">—</td>
                  <td className="hidden border-b border-slate-100 px-4 py-2.5 print:table-cell sm:table-cell" />
                </tr>
              )}
              <TGain label="Salaire de base" v={bulletin.salaire_base} />
              <TGain label="Indemnité / prime transport" v={bulletin.prime_transport} />
              <TGain label="Allocation / prime logement" v={bulletin.prime_logement} />
              <TGain label="Prime de performance" v={bulletin.prime_performance} />
              <TGain label="Autres primes" v={bulletin.autres_primes} />
              <tr className="bg-slate-50 font-semibold print:bg-slate-50">
                <td className="border-t border-slate-200 px-4 py-3">Total brut</td>
                <td className="border-t border-slate-200 px-4 py-3 text-right font-mono">{brut.toLocaleString("fr-FR")}</td>
                <td className="hidden border-t border-slate-200 px-4 py-3 text-center text-emerald-800 print:table-cell sm:table-cell">
                  Gain
                </td>
              </tr>
              <TRet label="Cotisation CNSS" v={bulletin.cnss} />
              <TRet label="Impôt sur le revenu" v={bulletin.impot} />
              <TRet label="Autres retenues" v={bulletin.autres_retenues} />
              <tr className="bg-slate-50 font-semibold print:bg-slate-50">
                <td className="border-t border-slate-200 px-4 py-3">Total retenues</td>
                <td className="border-t border-slate-200 px-4 py-3 text-right font-mono text-red-700">
                  -{totalRetenues.toLocaleString("fr-FR")}
                </td>
                <td className="hidden border-t border-slate-200 px-4 py-3 text-center text-red-800 print:table-cell sm:table-cell">
                  Retenue
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/90 px-5 py-4 print:border-emerald-300 print:bg-emerald-50">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-900">Net à payer</p>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-900 print:text-3xl">
              {bulletin.salaire_net.toLocaleString("fr-FR")}{" "}
              <span className="text-base font-semibold">FCFA</span>
            </p>
          </div>
          {datePaiement && (
            <div className="text-right text-sm">
              <p className="text-xs text-emerald-800">Date de paiement</p>
              <p className="font-mono font-medium text-emerald-900">{datePaiement}</p>
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-slate-100 px-6 py-4 text-[10px] leading-relaxed text-slate-500 print:px-0 print:py-3">
        <p>
          Document établi à partir des données saisies dans l&apos;application RH. Montants soumis à validation du
          service paie et à la réglementation applicable.
        </p>
        <p className="mt-2 font-mono text-slate-400">
          Réf. {formatReferenceBulletin(bulletin.id, String(bulletin.mois), bulletin.annee)}
          {bulletin.created_at?.slice(0, 10) ? ` — émis le ${bulletin.created_at.slice(0, 10).split("-").reverse().join("/")}` : ""}
        </p>
      </footer>
    </article>
  );
}

function TGain({ label, v }: { label: string; v: number }) {
  return (
    <tr>
      <td className="border-b border-slate-100 px-4 py-2.5">{label}</td>
      <td className="border-b border-slate-100 px-4 py-2.5 text-right font-mono">{v.toLocaleString("fr-FR")}</td>
      <td className="hidden border-b border-slate-100 px-4 py-2.5 text-center text-xs text-emerald-800 print:table-cell sm:table-cell">
        Gain
      </td>
    </tr>
  );
}

function TRet({ label, v }: { label: string; v: number }) {
  return (
    <tr>
      <td className="border-b border-slate-100 px-4 py-2.5">{label}</td>
      <td className="border-b border-slate-100 px-4 py-2.5 text-right font-mono text-red-700">
        {v > 0 ? `-${v.toLocaleString("fr-FR")}` : v.toLocaleString("fr-FR")}
      </td>
      <td className="hidden border-b border-slate-100 px-4 py-2.5 text-center text-xs text-red-800 print:table-cell sm:table-cell">
        Retenue
      </td>
    </tr>
  );
}
