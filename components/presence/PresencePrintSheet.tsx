import { useMemo } from "react";
import { PRESENCE_STATUT_LABELS } from "@/lib/presence-utils";
import type { Presence } from "@/lib/types";

type PresencePrintSummary = {
  effectif?: number;
  present: number;
  retard: number;
  absent: number;
  conge: number;
  mission: number;
  total: number;
  tauxPct: number;
};

type PresencePrintSheetProps = {
  presences: Presence[];
  periodLabel: string;
  summary: PresencePrintSummary;
};

export default function PresencePrintSheet({
  presences,
  periodLabel,
  summary,
}: PresencePrintSheetProps) {
  const rows = useMemo(
    () =>
      [...presences].sort((a, b) => {
        const byDate = a.date.localeCompare(b.date);
        if (byDate !== 0) return byDate;
        const an = `${a.employe_prenom ?? ""} ${a.employe_nom ?? ""}`.trim().toLowerCase();
        const bn = `${b.employe_prenom ?? ""} ${b.employe_nom ?? ""}`.trim().toLowerCase();
        return an.localeCompare(bn);
      }),
    [presences]
  );

  const generatedAt = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article className="presence-print-sheet">
      <header className="presence-print-header">
        <div>
          <p className="presence-print-brand">BV Groupe</p>
          <h1 className="presence-print-title">Liste des présences</h1>
        </div>
        <div className="presence-print-period">
          <p className="presence-print-label">{periodLabel}</p>
          <p className="presence-print-count">
            {rows.length} enregistrement(s) {summary.effectif != null ? `· effectif ${summary.effectif}` : ""}
          </p>
        </div>
      </header>

      <section className="presence-print-summary">
        <div className="presence-print-stat">
          <span>Présents</span>
          <strong>{summary.present}</strong>
        </div>
        <div className="presence-print-stat">
          <span>Retards</span>
          <strong>{summary.retard}</strong>
        </div>
        <div className="presence-print-stat">
          <span>Absents</span>
          <strong>{summary.absent}</strong>
        </div>
        <div className="presence-print-stat">
          <span>Congés</span>
          <strong>{summary.conge}</strong>
        </div>
        <div className="presence-print-stat">
          <span>Missions</span>
          <strong>{summary.mission}</strong>
        </div>
        <div className="presence-print-stat presence-print-stat-highlight">
          <span>Taux de présence</span>
          <strong>{summary.tauxPct}%</strong>
        </div>
      </section>

      <table className="presence-print-table">
        <thead>
          <tr>
            <th className="presence-print-col-num">N°</th>
            <th>Employé</th>
            <th>Date</th>
            <th>Arrivée</th>
            <th>Sortie</th>
            <th className="presence-print-col-hsup">H. sup</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="presence-print-empty">
                Aucun pointage pour cette période.
              </td>
            </tr>
          ) : (
            rows.map((p, i) => (
              <tr key={p.id}>
                <td className="presence-print-col-num">{i + 1}</td>
                <td>
                  <span className="presence-print-name">
                    {p.employe_prenom} {p.employe_nom}
                  </span>
                  {p.employe_poste ? <span className="presence-print-poste">{p.employe_poste}</span> : null}
                </td>
                <td>{formatShortDate(p.date)}</td>
                <td className="presence-print-mono">{p.heure_entree ?? "—"}</td>
                <td className="presence-print-mono">{p.heure_sortie ?? "—"}</td>
                <td className="presence-print-mono presence-print-col-hsup">
                  {p.heures_supplementaires > 0 ? `+${p.heures_supplementaires}h` : "—"}
                </td>
                <td>{PRESENCE_STATUT_LABELS[p.statut] ?? p.statut}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <footer className="presence-print-footer">
        <div>
          <p>Document généré le {generatedAt} à partir des données de l&apos;application RH BV Groupe.</p>
          <p>La liste reflète l&apos;état des pointages à la date de génération du document.</p>
        </div>
        <div className="presence-print-signature">
          <span>Signature du responsable</span>
        </div>
      </footer>
    </article>
  );
}

function formatShortDate(value?: string | null): string {
  if (!value) return "—";
  const iso = value.includes("T") ? value.slice(0, 10) : value.slice(0, 10);
  const parts = iso.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    if (y && m && d) {
      return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
  }
  return value;
}
