import type { BudgetEnveloppeStatut, BudgetSynthese } from "@/lib/types";

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string {
  return v != null ? String(v) : "";
}

/** Adapte la réponse API Nest vers le modèle UI BudgetSynthese. */
export function normalizeBudgetSynthese(raw: unknown, anneeFallback?: number): BudgetSynthese {
  const o = rec(raw);
  const totauxRaw = rec(o.totaux ?? o.totals ?? o.total);

  const prevu_actif = num(
    totauxRaw.prevu_actif ?? totauxRaw.prevuActif ?? totauxRaw.prevu ?? o.prevu_actif
  );
  const realise_approuve_paye = num(
    totauxRaw.realise_approuve_paye ??
      totauxRaw.realiseApprouvePaye ??
      totauxRaw.realise ??
      o.realise_approuve_paye
  );
  const en_attente = num(totauxRaw.en_attente ?? totauxRaw.enAttente ?? o.en_attente);

  let taux_consommation_pct = numOrNull(
    totauxRaw.taux_consommation_pct ?? totauxRaw.tauxConsommationPct ?? totauxRaw.taux_consommation
  );
  if (taux_consommation_pct === null && prevu_actif > 0) {
    taux_consommation_pct = Math.round((realise_approuve_paye / prevu_actif) * 1000) / 10;
  }

  const parRaw = o.par_enveloppe ?? o.parEnveloppe ?? o.enveloppes;
  const par_enveloppe = (Array.isArray(parRaw) ? parRaw : []).map((row) => {
    const r = rec(row);
    return {
      id: num(r.id),
      libelle: str(r.libelle ?? r.nom),
      departement: r.departement != null ? str(r.departement) : null,
      montant_prevu: num(r.montant_prevu ?? r.montantPrevu),
      realise: num(r.realise),
      en_attente: num(r.en_attente ?? r.enAttente),
      ecart: num(r.ecart ?? (num(r.montant_prevu ?? r.montantPrevu) - num(r.realise))),
      statut: str(r.statut || "actif") as BudgetEnveloppeStatut,
    };
  });

  const moisRaw = o.depenses_par_mois ?? o.depensesParMois ?? o.depenses_mensuelles;
  const depenses_par_mois = (Array.isArray(moisRaw) ? moisRaw : []).map((row) => {
    const r = rec(row);
    const mois = str(r.mois ?? r.cle ?? "");
    const label = str(r.label ?? r.libelle ?? mois);
    return {
      mois,
      label,
      montant: num(r.montant),
    };
  });

  const annee = num(o.annee ?? o.year) || anneeFallback || new Date().getFullYear();

  return {
    genere_le: str(o.genere_le ?? o.genereLe) || new Date().toISOString(),
    annee,
    totaux: {
      prevu_actif,
      realise_approuve_paye,
      en_attente,
      refuse: num(totauxRaw.refuse),
      taux_consommation_pct,
    },
    par_enveloppe,
    depenses_par_mois,
  };
}
