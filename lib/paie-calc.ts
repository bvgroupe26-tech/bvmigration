/** Calcul du salaire net à partir des lignes bulletin (aucune valeur imposée côté code métier). */

export type PaieMontants = {
  salaire_base: number;
  prime_transport: number;
  prime_logement: number;
  prime_performance: number;
  autres_primes: number;
  cnss: number;
  impot: number;
  autres_retenues: number;
};

export function calcSalaireNet(p: PaieMontants): number {
  const brut =
    p.salaire_base +
    p.prime_transport +
    p.prime_logement +
    p.prime_performance +
    p.autres_primes;
  return Math.round(brut - (p.cnss + p.impot + p.autres_retenues));
}
