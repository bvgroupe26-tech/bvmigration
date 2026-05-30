import type { StatistiquesSynthese } from "@/lib/types";

const MOIS_LABELS: Record<string, string> = {
  "01": "Janvier",
  "02": "Février",
  "03": "Mars",
  "04": "Avril",
  "05": "Mai",
  "06": "Juin",
  "07": "Juillet",
  "08": "Août",
  "09": "Septembre",
  "10": "Octobre",
  "11": "Novembre",
  "12": "Décembre",
};

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function moisLabel(mois: string, annee: number): string {
  const key = String(mois).padStart(2, "0");
  return `${MOIS_LABELS[key] ?? key} ${annee}`;
}

/** Adapte la réponse API actuelle vers le modèle UI StatistiquesSynthese. */
export function normalizeStatistiquesSynthese(raw: unknown): StatistiquesSynthese {
  const o = rec(raw);

  if (o.headline && o.rh && o.paie) {
    return raw as StatistiquesSynthese;
  }

  const effectifs = rec(o.effectifs ?? o.rh);
  const paieRaw = rec(o.paie);
  const presences = rec(o.presences ?? o.presence);
  const formations = rec(o.formations ?? o.performance);
  const evaluations = rec(o.evaluations ?? o.performance);
  const recrutement = rec(o.recrutement);

  const actifs = num(effectifs.actifs ?? effectifs.actif);
  const inactifs = num(effectifs.inactifs ?? effectifs.inactif);
  const suspendus = num(effectifs.suspendus ?? effectifs.suspendu);
  const total = num(effectifs.total ?? effectifs.effectif_total) || actifs + inactifs + suspendus;

  const masseRows = Array.isArray(paieRaw.masseSalariale12mois)
    ? paieRaw.masseSalariale12mois
    : Array.isArray(paieRaw.evolution_mensuelle)
      ? paieRaw.evolution_mensuelle
      : [];

  const evolution_mensuelle = masseRows.map((row) => {
    const r = rec(row);
    const mois = String(r.mois ?? "").padStart(2, "0");
    const annee = num(r.annee) || new Date().getFullYear();
    const cle = `${annee}-${mois}`;
    return {
      cle,
      label: moisLabel(mois, annee),
      masse_net: num(r.montant ?? r.masse_net ?? r.masseNet),
      bulletins: num(r.bulletins),
      payes: num(r.payes),
    };
  });

  const cumul_net_annee = evolution_mensuelle.reduce((acc, m) => acc + m.masse_net, 0);
  const last = evolution_mensuelle[evolution_mensuelle.length - 1];
  const now = new Date();

  return {
    genere_le: String(o.genere_le ?? o.genereLe ?? new Date().toISOString()),
    headline: {
      employes_actifs: actifs,
      presents_aujourd_hui: num(presences.presents ?? presences.present),
      masse_net_mois_courant: last?.masse_net ?? cumul_net_annee,
      note_moyenne_evaluations: num(evaluations.moyenneGlobale ?? evaluations.note_globale) || null,
      candidatures_en_cours: num(
        recrutement.candidaturesEnCours ?? recrutement.candidatures_en_cours
      ),
    },
    rh: {
      total_par_statut: { actif: actifs, inactif: inactifs, suspendu: suspendus },
      effectif_total: total,
      contrats_actifs: (effectifs.contrats_actifs as Record<string, number>) ?? {},
      masse_brute_mensuelle_fcfa: last?.masse_net ?? 0,
      departements: Array.isArray(effectifs.departements)
        ? (effectifs.departements as Array<{ nom: string; effectif: number }>)
        : [],
    },
    paie: {
      annee_courante: num(last?.cle?.slice(0, 4)) || now.getFullYear(),
      mois_courant: last?.cle?.slice(5, 7) ?? String(now.getMonth() + 1).padStart(2, "0"),
      evolution_mensuelle,
      cumul_net_annee,
    },
    presence: {
      serie_mensuelle: [],
      aujourd_hui: {
        date: now.toISOString().slice(0, 10),
        present: num(presences.presents ?? presences.present),
        absent: num(presences.absents ?? presences.absent),
        retard: num(presences.retards ?? presences.retard),
        conge: num(presences.conges ?? presences.conge),
        mission: num(presences.missions ?? presences.mission),
        total: num(presences.total) || num(presences.presents),
      },
      absences_en_attente: num(presences.absences_en_attente ?? presences.enAttente),
    },
    recrutement: {
      offres: {
        ouverte: num(recrutement.offresOuvertes ?? recrutement.ouverte),
        fermee: num(recrutement.offresFermees ?? recrutement.fermee),
        pourvue: num(recrutement.offresPourvues ?? recrutement.pourvue),
        total: num(recrutement.total),
      },
      candidatures_par_statut: {
        recu: num(recrutement.recu),
        en_cours: num(recrutement.en_cours ?? recrutement.enCours),
        retenu: num(recrutement.retenu),
        rejete: num(recrutement.rejete),
        total: num(recrutement.total),
      },
      taux_retenu_pct: null,
    },
    performance: {
      evaluations_12_mois: num(formations.total ?? evaluations.count),
      moyennes: {
        note_globale: num(evaluations.moyenneGlobale ?? evaluations.note_globale) || null,
        ponctualite: num(evaluations.ponctualite) || null,
        qualite_travail: num(evaluations.qualiteTravail ?? evaluations.qualite_travail) || null,
        travail_equipe: num(evaluations.travailEquipe ?? evaluations.travail_equipe) || null,
        initiative: num(evaluations.initiative) || null,
      },
      evolution_mensuelle: [],
      repartition_notes: [],
    },
  };
}
