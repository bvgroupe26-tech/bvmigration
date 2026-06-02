import type { Employe } from "@/lib/types";
import type { EmployeMe } from "@/lib/employee/types";

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function pick(o: Record<string, unknown>, snake: string, camel: string): unknown {
  return o[snake] ?? o[camel];
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string | null {
  if (v == null || v === "") return null;
  return String(v);
}

function dateOnly(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  return s.includes("T") ? s.slice(0, 10) : s;
}

export function normalizeEmploye(raw: unknown): Employe {
  const o = rec(raw);
  return {
    id: num(o.id),
    matricule: str(o.matricule),
    nom: String(o.nom ?? ""),
    prenom: String(o.prenom ?? ""),
    date_naissance: dateOnly(pick(o, "date_naissance", "dateNaissance")),
    telephone: str(o.telephone),
    email: str(o.email),
    adresse: str(o.adresse),
    situation_familiale: (str(pick(o, "situation_familiale", "situationFamiliale")) ??
      null) as Employe["situation_familiale"],
    nombre_enfants: num(pick(o, "nombre_enfants", "nombreEnfants")),
    type_contrat: (str(pick(o, "type_contrat", "typeContrat")) ?? null) as Employe["type_contrat"],
    poste: str(o.poste),
    departement: str(o.departement),
    date_embauche: dateOnly(pick(o, "date_embauche", "dateEmbauche")),
    date_fin_contrat: dateOnly(pick(o, "date_fin_contrat", "dateFinContrat")),
    salaire_base: num(pick(o, "salaire_base", "salaireBase")),
    def_prime_transport: num(pick(o, "def_prime_transport", "defPrimeTransport")),
    def_prime_logement: num(pick(o, "def_prime_logement", "defPrimeLogement")),
    def_prime_performance: num(pick(o, "def_prime_performance", "defPrimePerformance")),
    def_autres_primes: num(pick(o, "def_autres_primes", "defAutresPrimes")),
    def_taux_cnss:
      pick(o, "def_taux_cnss", "defTauxCnss") == null
        ? null
        : num(pick(o, "def_taux_cnss", "defTauxCnss")),
    def_taux_impot:
      pick(o, "def_taux_impot", "defTauxImpot") == null
        ? null
        : num(pick(o, "def_taux_impot", "defTauxImpot")),
    statut: (String(o.statut ?? "actif") as Employe["statut"]),
    avatar: str(o.avatar ?? pick(o, "avatar_url", "avatarUrl")),
    created_at: String(pick(o, "created_at", "createdAt") ?? ""),
    updated_at: String(pick(o, "updated_at", "updatedAt") ?? ""),
  };
}

export function normalizeEmployeList(raw: unknown): Employe[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeEmploye);
}

export function normalizeEmployeMe(raw: unknown): EmployeMe {
  const e = normalizeEmploye(raw);
  return {
    id: e.id,
    nom: e.nom,
    prenom: e.prenom,
    email: e.email,
    telephone: e.telephone,
    adresse: e.adresse,
    poste: e.poste,
    departement: e.departement,
    matricule: e.matricule,
    type_contrat: e.type_contrat,
    date_embauche: e.date_embauche,
    date_fin_contrat: e.date_fin_contrat,
    statut: e.statut,
    avatar: e.avatar,
    updated_at: e.updated_at,
  };
}
