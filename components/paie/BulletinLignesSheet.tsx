import StatBadge from "@/components/ui/StatBadge";
import {
  BULLETIN_STATUT_LABELS,
  BULLETIN_TYPE_LABELS,
  MODE_PAIEMENT_LABELS,
  bulletinStatutBadge,
  formatMontant,
  formatTaux,
  periodeLabel,
  type BulletinDetail,
  type ModePaiement,
  type PayslipLine,
} from "@/lib/types-paie";
import { cn } from "@/lib/utils";

const RETENUE_TYPES = new Set(["retenue", "cotisation", "impot"]);

const CUMUL_LABELS: Record<string, string> = {
  brut: "Brut",
  brutImposable: "Brut imposable",
  netImposable: "Net imposable",
  irpp: "IRPP",
  totalCotisSal: "Cotisations salariales",
  totalCotisPat: "Charges patronales",
  net: "Net payé",
  netAPayer: "Net payé",
};

type Props = {
  bulletin: BulletinDetail;
  showStatutBadge?: boolean;
  className?: string;
};

export default function BulletinLignesSheet({ bulletin, showStatutBadge = true, className }: Props) {
  const { employe: e, employeur: er, totaux: t } = bulletin;
  const gains = bulletin.lignes.filter((l) => l.type === "gain");
  const retenues = bulletin.lignes.filter((l) => RETENUE_TYPES.has(l.type));
  const infos = bulletin.lignes.filter((l) => l.type === "info");
  const datePaiement = bulletin.datePaiement ? new Date(bulletin.datePaiement).toLocaleDateString("fr-FR") : null;
  const modePaiement = e.modePaiement ? MODE_PAIEMENT_LABELS[e.modePaiement as ModePaiement] ?? e.modePaiement : null;
  const cumuls = Object.entries(bulletin.cumuls);

  return (
    <article
      id="bulletin-paie-feuille"
      className={cn(
        "bulletin-print-root overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none",
        className
      )}
    >
      <header className="grid gap-4 border-b border-slate-200 px-6 py-5 sm:grid-cols-2 print:px-0 print:py-2">
        <div className="space-y-0.5 text-xs text-slate-600">
          <p className="font-display text-base font-bold text-slate-900">{er?.raisonSociale ?? "Employeur"}</p>
          {er?.adresse && <p>{[er.adresse, er.ville].filter(Boolean).join(", ")}</p>}
          {er?.niu && <p>NIU : <span className="font-mono">{er.niu}</span></p>}
          {er?.rccm && <p>RCCM : <span className="font-mono">{er.rccm}</span></p>}
          {er?.numeroCnssEmployeur && (
            <p>N° CNSS employeur : <span className="font-mono">{er.numeroCnssEmployeur}</span></p>
          )}
          {er?.conventionCollective && <p>Convention : {er.conventionCollective}</p>}
        </div>
        <div className="sm:text-right">
          <h1 className="font-display text-xl font-bold tracking-tight text-slate-900">
            {bulletin.type === "normal" ? "Bulletin de paie" : BULLETIN_TYPE_LABELS[bulletin.type]}
          </h1>
          <p className="text-sm font-semibold text-slate-700">{periodeLabel(bulletin.mois, bulletin.annee)}</p>
          {bulletin.numero && <p className="mt-1 font-mono text-xs text-slate-500">N° {bulletin.numero}</p>}
          {showStatutBadge && (
            <div className="mt-2 flex sm:justify-end print:hidden">
              <StatBadge variant={bulletinStatutBadge(bulletin.statut)}>{BULLETIN_STATUT_LABELS[bulletin.statut]}</StatBadge>
            </div>
          )}
        </div>
      </header>

      <section className="border-b border-slate-100 px-6 py-4 print:px-0 print:py-2">
        <p className="font-display text-lg font-bold text-slate-900">
          {e.prenom} {e.nom}
        </p>
        <dl className="mt-2 grid grid-cols-1 gap-x-8 gap-y-1 text-xs sm:grid-cols-3">
          <Info label="Matricule" value={e.matricule} mono />
          <Info label="Emploi" value={e.poste} />
          <Info label="Département" value={e.departement} />
          <Info label="N° CNSS" value={e.numeroCnss} mono />
          <Info label="NIU" value={e.niu} mono />
          <Info label="Catégorie / échelon" value={[e.categorie, e.echelon].filter(Boolean).join(" / ") || null} />
          <Info label="Date d'embauche" value={e.dateEmbauche ? e.dateEmbauche.split("-").reverse().join("/") : null} />
          <Info label="Mode de paiement" value={modePaiement} />
          {e.rib && <Info label="RIB" value={e.rib} mono />}
          {e.mobileMoney && <Info label="Mobile Money" value={e.mobileMoney} mono />}
        </dl>
      </section>

      <section className="px-6 py-5 print:px-0 print:py-2">
        <div className="overflow-x-auto rounded-xl border border-slate-200 print:rounded-none">
          <table className="bulletin-pro-table w-full min-w-[720px] border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 print:bg-white">
                <th className="border-b border-slate-200 px-3 py-2.5">Code</th>
                <th className="border-b border-slate-200 px-3 py-2.5">Libellé</th>
                <th className="border-b border-slate-200 px-3 py-2.5 text-right">Base</th>
                <th className="border-b border-slate-200 px-3 py-2.5 text-right">Taux</th>
                <th className="border-b border-slate-200 px-3 py-2.5 text-right">Gains</th>
                <th className="border-b border-slate-200 px-3 py-2.5 text-right">Retenues</th>
                <th className="border-b border-slate-200 px-3 py-2.5 text-right">Part patronale</th>
              </tr>
            </thead>
            <tbody className="text-slate-800">
              {gains.map((l) => (
                <LineRow key={`g-${l.code}-${l.ordre}`} line={l} />
              ))}
              <TotalRow label="Salaire brut" gains={t.brut} />
              {retenues.map((l) => (
                <LineRow key={`r-${l.code}-${l.ordre}`} line={l} />
              ))}
              <TotalRow label="Total des retenues" retenues={t.totalCotisSal} patronal={t.totalCotisPat} />
              {infos.map((l) => (
                <LineRow key={`i-${l.code}-${l.ordre}`} line={l} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Amount label="Brut imposable" value={t.brutImposable} />
          <Amount label="Net imposable" value={t.netImposable} />
          <Amount label="Charges patronales" value={t.totalCotisPat} />
        </div>

        <div className="bulletin-print-net mt-4 flex flex-wrap items-end justify-between gap-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/90 px-5 py-4 print:border-emerald-300">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-900">Net à payer</p>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-900">
              {formatMontant(t.netAPayer) || "0"} <span className="text-base font-semibold">FCFA</span>
            </p>
          </div>
          {datePaiement && (
            <div className="text-right text-sm">
              <p className="text-xs text-emerald-800">Payé le</p>
              <p className="font-mono font-medium text-emerald-900">{datePaiement}</p>
            </div>
          )}
        </div>

        {cumuls.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-200 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Cumuls annuels {bulletin.annee}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
              {cumuls.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt className="text-slate-500">{CUMUL_LABELS[k] ?? k}</dt>
                  <dd className="font-mono text-slate-900">{formatMontant(v)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </section>

      <footer className="bulletin-print-footer border-t border-slate-100 px-6 py-4 text-[10px] leading-relaxed text-slate-500 print:px-0 print:py-2">
        <p>Bulletin établi par le service paie. À conserver sans limitation de durée.</p>
        {bulletin.validatedAt && (
          <p className="mt-1">Validé le {new Date(bulletin.validatedAt).toLocaleDateString("fr-FR")}</p>
        )}
        {bulletin.numero && (
          <p className="mt-1 font-mono text-slate-400">
            Vérification : /verify/paie/{bulletin.numero}
          </p>
        )}
      </footer>
    </article>
  );
}

function Info({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className={cn("truncate text-slate-900", mono && "font-mono")}>{value || "—"}</dd>
    </div>
  );
}

function LineRow({ line }: { line: PayslipLine }) {
  const isGain = line.type === "gain";
  const isRetenue = RETENUE_TYPES.has(line.type);
  const quantiteBase = line.quantite != null && line.base == null ? line.quantite : null;
  return (
    <tr className={cn(line.type === "info" && "text-slate-500")}>
      <td className="border-b border-slate-100 px-3 py-2 font-mono text-[11px] text-slate-500">{line.code}</td>
      <td className="border-b border-slate-100 px-3 py-2">{line.libelle}</td>
      <td className="border-b border-slate-100 px-3 py-2 text-right font-mono">
        {line.base != null ? formatMontant(line.base) : quantiteBase != null ? quantiteBase.toLocaleString("fr-FR") : ""}
      </td>
      <td className="border-b border-slate-100 px-3 py-2 text-right font-mono">{formatTaux(line.taux)}</td>
      <td className="border-b border-slate-100 px-3 py-2 text-right font-mono">
        {isGain && line.montantSalarial !== 0 ? formatMontant(line.montantSalarial) : ""}
      </td>
      <td className="border-b border-slate-100 px-3 py-2 text-right font-mono text-red-700">
        {isRetenue && line.montantSalarial !== 0 ? formatMontant(line.montantSalarial) : ""}
      </td>
      <td className="border-b border-slate-100 px-3 py-2 text-right font-mono text-slate-600">
        {line.montantPatronal !== 0 ? formatMontant(line.montantPatronal) : ""}
      </td>
    </tr>
  );
}

function TotalRow({
  label,
  gains,
  retenues,
  patronal,
}: {
  label: string;
  gains?: number | null;
  retenues?: number | null;
  patronal?: number | null;
}) {
  return (
    <tr className="bg-slate-50 font-semibold">
      <td className="border-y border-slate-200 px-3 py-2" />
      <td className="border-y border-slate-200 px-3 py-2">{label}</td>
      <td className="border-y border-slate-200 px-3 py-2" />
      <td className="border-y border-slate-200 px-3 py-2" />
      <td className="border-y border-slate-200 px-3 py-2 text-right font-mono">{formatMontant(gains)}</td>
      <td className="border-y border-slate-200 px-3 py-2 text-right font-mono text-red-700">{formatMontant(retenues)}</td>
      <td className="border-y border-slate-200 px-3 py-2 text-right font-mono">{formatMontant(patronal)}</td>
    </tr>
  );
}

function Amount({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl border border-slate-200 px-4 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">{formatMontant(value) || "—"} F</p>
    </div>
  );
}
