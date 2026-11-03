"use client";

import StatBadge from "@/components/ui/StatBadge";
import { DEPENSE_STATUT_LABELS, depenseStatutBadgeVariant } from "@/lib/budget-depense-utils";
import type { BudgetDepenseStatut } from "@/lib/types-finance";

export default function DepenseStatutBadge({ statut }: { statut: BudgetDepenseStatut }) {
  return <StatBadge variant={depenseStatutBadgeVariant(statut)}>{DEPENSE_STATUT_LABELS[statut]}</StatBadge>;
}
