"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import useSWR from "swr";
import { X, FileText, Download, ExternalLink } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import type { Absence, Employe, Evaluation, Paie } from "@/lib/types";

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  department: string;
  email: string;
  phone: string;
  address: string;
  nationality: string;
  birthDate: string;
  hireDate: string;
  contractType: "CDI" | "CDD" | "Stage" | "Freelance";
  contractEndDate?: string;
  grossSalary: number;
  netSalary: number;
  paymentMethod: "Virement" | "Mobile Money";
  status: "Actif" | "En congé" | "Inactif";
  leaveBalance: number;
  performanceScore: number | null;
  familySituation: string;
  salaryHistory: { date: string; oldSalary: number; newSalary: number }[];
  documents: { name: string; url: string }[];
  absences: { date: string; type: string; duration: number; status: "Approuvé" | "Refusé" | "En attente" }[];
}

export interface EmployeeDetailPanelProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
}

type PanelCtx = {
  isOpen: boolean;
  selectedEmploye: Employe | null;
  openPanel: (e: Employe) => void;
  closePanel: () => void;
};

const EmployeePanelContext = createContext<PanelCtx | null>(null);

export function EmployeePanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEmploye, setSelectedEmploye] = useState<Employe | null>(null);

  const openPanel = useCallback((e: Employe) => {
    setSelectedEmploye(e);
    setIsOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setIsOpen(false);
    setSelectedEmploye(null);
  }, []);

  const value = useMemo(
    () => ({ isOpen, selectedEmploye, openPanel, closePanel }),
    [isOpen, selectedEmploye, openPanel, closePanel]
  );

  return (
    <EmployeePanelContext.Provider value={value}>
      {children}
      <EmployeeDetailPanelBridge />
    </EmployeePanelContext.Provider>
  );
}

export function useEmployeePanel(): PanelCtx {
  const ctx = useContext(EmployeePanelContext);
  if (!ctx) {
    throw new Error("useEmployeePanel doit être utilisé dans un EmployeePanelProvider");
  }
  return ctx;
}

function EmployeeDetailPanelBridge() {
  const { isOpen, selectedEmploye, closePanel } = useEmployeePanel();
  const empId = selectedEmploye?.id;

  const { data: absencesRaw } = useSWR<Absence[]>(
    isOpen && empId != null ? `/absences?employe_id=${empId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: evaluationsRaw } = useSWR<Evaluation[]>(
    isOpen && empId != null ? `/evaluations?employe_id=${empId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: paieRaw } = useSWR<Paie[]>(
    isOpen && empId != null ? `/paie?employe_id=${empId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const employee = useMemo(() => {
    if (!selectedEmploye) return null;
    return mapEmployeToEmployee(
      selectedEmploye,
      absencesRaw ?? [],
      evaluationsRaw ?? [],
      paieRaw ?? []
    );
  }, [selectedEmploye, absencesRaw, evaluationsRaw, paieRaw]);

  return <EmployeeDetailPanel employee={employee} isOpen={isOpen} onClose={closePanel} />;
}

export function formatFcfa(n: number): string {
  const s = Math.round(n).toLocaleString("fr-FR").replace(/\u202f/g, " ");
  return `${s} FCFA`;
}

function deptAvatarHsl(dept: string): string {
  let h = 0;
  for (let i = 0; i < dept.length; i++) h = dept.charCodeAt(i) + ((h << 5) - h);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 55% 42%)`;
}

function mapContract(e: Employe): Employee["contractType"] {
  const t = e.type_contrat;
  if (t === "CDI" || t === "CDD" || t === "Stage" || t === "Freelance") return t;
  return "Freelance";
}

function mapStatus(statut: Employe["statut"]): Employee["status"] {
  if (statut === "actif") return "Actif";
  if (statut === "suspendu") return "En congé";
  return "Inactif";
}

function famLabel(s: Employe["situation_familiale"]): string {
  if (!s) return "—";
  const m: Record<string, string> = {
    celibataire: "Célibataire",
    marie: "Marié(e)",
    divorce: "Divorcé(e)",
    veuf: "Veuf(ve)",
  };
  return m[s] ?? s;
}

function absenceTypeFr(t: string): string {
  const m: Record<string, string> = {
    maladie: "Maladie",
    conge_paye: "Congé payé",
    conge_sans_solde: "Congé sans solde",
    maternite: "Maternité",
    paternite: "Paternité",
    autre: "Autre",
  };
  return m[t] ?? t;
}

function absenceStatutFr(s: Absence["statut"]): "Approuvé" | "Refusé" | "En attente" {
  if (s === "approuve") return "Approuvé";
  if (s === "refuse") return "Refusé";
  return "En attente";
}

function daysInclusive(debut: string, fin: string): number {
  const a = new Date(debut).getTime();
  const b = new Date(fin).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(1, Math.ceil((b - a) / 86400000) + 1);
}

function yearsTenure(hire: string | null): string {
  if (!hire) return "—";
  const ms = Date.now() - new Date(hire).getTime();
  if (Number.isNaN(ms) || ms < 0) return "—";
  const years = ms / (365.25 * 86400000);
  if (years < 1) return `${Math.max(0, Math.round((ms / (30.44 * 86400000)) * 10) / 10)} mois`;
  return `${years.toFixed(1)} ans`;
}

function estimateNet(gross: number): number {
  if (gross <= 0) return 0;
  /* Sans bulletin enregistré, aucune retenue n'est estimée automatiquement. */
  return Math.round(gross);
}

function brutFromPaie(p: Paie): number {
  return (
    p.salaire_base +
    p.prime_transport +
    p.prime_logement +
    p.prime_performance +
    p.autres_primes
  );
}

function sortPaieChronological(rows: Paie[]): Paie[] {
  return [...rows].sort((a, b) => {
    if (a.annee !== b.annee) return a.annee - b.annee;
    return Number(a.mois) - Number(b.mois);
  });
}

function mapEmployeToEmployee(
  e: Employe,
  absences: Absence[],
  evaluations: Evaluation[],
  paieRows: Paie[]
): Employee {
  const gross = e.salaire_base ?? 0;
  const sortedPaie = sortPaieChronological(paieRows);
  const latestPaie = sortedPaie.length > 0 ? sortedPaie[sortedPaie.length - 1] : null;
  const net =
    latestPaie != null ? Math.round(latestPaie.salaire_net) : estimateNet(gross);
  const perf: number | null = (() => {
    if (!evaluations.length) return null;
    const latest = evaluations[0]?.note_globale;
    if (latest != null) return Math.min(100, Math.round(latest * 10));
    const avg = evaluations.reduce((s, x) => s + x.note_globale, 0) / evaluations.length;
    return Math.min(100, Math.round(avg * 10));
  })();

  const hire = e.date_embauche ?? "";
  const salaryHistory: Employee["salaryHistory"] = [];
  if (sortedPaie.length >= 2) {
    for (let i = 1; i < sortedPaie.length; i++) {
      const prev = sortedPaie[i - 1];
      const curr = sortedPaie[i];
      salaryHistory.push({
        date: `${curr.annee}-${String(curr.mois).padStart(2, "0")}-01`,
        oldSalary: Math.round(brutFromPaie(prev)),
        newSalary: Math.round(brutFromPaie(curr)),
      });
    }
  }

  const documents: Employee["documents"] = [];

  const absRows = absences.map((a) => ({
    date: a.date_debut,
    type: absenceTypeFr(a.type_absence),
    duration: daysInclusive(a.date_debut, a.date_fin),
    status: absenceStatutFr(a.statut),
  }));

  return {
    id: String(e.id),
    firstName: e.prenom,
    lastName: e.nom,
    jobTitle: e.poste ?? "—",
    department: e.departement ?? "—",
    email: e.email ?? "—",
    phone: e.telephone ?? "—",
    address: e.adresse ?? "—",
    nationality: "—",
    birthDate: e.date_naissance ?? "—",
    hireDate: hire,
    contractType: mapContract(e),
    contractEndDate: e.type_contrat === "CDD" ? undefined : undefined,
    grossSalary: gross,
    netSalary: net,
    paymentMethod: "Virement",
    status: mapStatus(e.statut),
    leaveBalance: 0,
    performanceScore: perf,
    familySituation: famLabel(e.situation_familiale),
    salaryHistory,
    documents,
    absences: absRows,
  };
}

const CONTRACT_BADGE: Record<Employee["contractType"], string> = {
  CDI: "border-[#2F5F9D]/30 bg-[#2F5F9D]/15 text-[#2F5F9D]/80",
  CDD: "border-amber-500/40 bg-amber-500/15 text-amber-200",
  Stage: "border-[#2F5F9D]/30 bg-[#E8F0FA] text-[#1F3F73]",
  Freelance: "border-teal-500/40 bg-teal-500/15 text-teal-200",
};

export default function EmployeeDetailPanel({ employee, isOpen, onClose }: EmployeeDetailPanelProps) {
  const [tab, setTab] = useState<1 | 2 | 3>(1);
  const [drawerEntered, setDrawerEntered] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setDrawerEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => setDrawerEntered(true));
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setTab(1);
  }, [isOpen, employee?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const initials =
    employee &&
    `${employee.firstName?.[0] ?? ""}${employee.lastName?.[0] ?? ""}`.toUpperCase().slice(0, 2);
  const avatarBg = employee ? deptAvatarHsl(employee.department) : "#334155";

  return (
    <div className="fixed inset-0 z-[10000] flex justify-end">
      <button
        type="button"
        aria-label="Fermer le panneau"
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      <aside
        className={`relative z-[10001] flex h-full w-full max-w-[480px] flex-col border-l border-slate-200 bg-white shadow-xl shadow-slate-900/10 transition-transform duration-[250ms] ease-out ${
          drawerEntered ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {!employee ? (
          <div className="flex flex-1 items-center justify-center p-8 text-text-secondary">
            Chargement…
          </div>
        ) : (
          <>
            <div className="shrink-0 border-b border-slate-200 bg-white px-5 pb-4 pt-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-1 flex flex-col items-center text-center">
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-full text-xl font-bold text-white ring-2 ring-white/10"
                  style={{ backgroundColor: avatarBg }}
                >
                  {initials}
                </div>
                <h2 className="mt-4 font-display text-2xl font-semibold text-slate-900">
                  {employee.firstName} {employee.lastName}
                </h2>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  <span className="text-sm text-text-secondary">{employee.jobTitle}</span>
                  <span className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                    {employee.department}
                  </span>
                </div>
                <div className="mt-3">
                  <span
                    className={
                      employee.status === "Actif"
                        ? "inline-flex rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300"
                        : employee.status === "En congé"
                          ? "inline-flex rounded-full border border-amber-500/35 bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-200"
                          : "inline-flex rounded-full border border-red-500/35 bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-300"
                    }
                  >
                    {employee.status}
                  </span>
                </div>
                <Link
                  href={`/employes/${employee.id}`}
                  onClick={onClose}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#2F5F9D] transition hover:text-[#1F3F73]"
                >
                  Ouvrir la fiche complète
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-slate-200 bg-white px-4 py-3 sm:grid-cols-4">
              <StatMini label="Ancienneté" value={yearsTenure(employee.hireDate || null)} />
              <StatMini label="Salaire brut" value={formatFcfa(employee.grossSalary)} small />
              <StatMini label="Congés restants" value={`${employee.leaveBalance} j`} />
              <StatMini
                label="Performance"
                value={employee.performanceScore != null ? `${employee.performanceScore}/100` : "—"}
              />
            </div>

            <div className="flex shrink-0 border-b border-slate-200 bg-slate-50 px-2">
              {(
                [
                  [1, "Informations"],
                  [2, "Contrat & Paie"],
                  [3, "Documents"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`relative flex-1 px-2 py-3 text-center text-[13px] font-medium transition ${
                    tab === id ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {label}
                  {tab === id && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[#2F5F9D]" />
                  )}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-4">
              {tab === 1 && <TabInfo employee={employee} />}
              {tab === 2 && <TabContract employee={employee} />}
              {tab === 3 && <TabDocs employee={employee} />}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function StatMini({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
      <p className="text-[11px] uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className={`mt-0.5 font-mono font-semibold text-slate-900 ${small ? "text-[11px] leading-tight" : "text-sm"}`}>
        {value}
      </p>
    </div>
  );
}

function TabInfo({ employee }: { employee: Employee }) {
  const fields: [string, string][] = [
    ["Nom complet", `${employee.firstName} ${employee.lastName}`],
    ["Date de naissance", fmtDate(employee.birthDate)],
    ["Nationalité", employee.nationality],
    ["Situation familiale", employee.familySituation],
    ["Email professionnel", employee.email],
    ["Téléphone", employee.phone],
    ["Adresse", employee.address],
  ];
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {fields.map(([k, v]) => (
        <div key={k} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <dt className="text-[12px] text-text-tertiary">{k}</dt>
          <dd className="mt-1 text-[14px] text-slate-900">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function fmtDate(s: string): string {
  if (!s || s === "—") return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("fr-FR");
}

function TabContract({ employee }: { employee: Employee }) {
  const badge = CONTRACT_BADGE[employee.contractType];
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[12px] text-text-tertiary">Type de contrat</p>
        <span className={`mt-1 inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${badge}`}>
          {employee.contractType}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Date d'embauche" value={fmtDate(employee.hireDate)} />
        <Field
          label="Date fin de contrat"
          value={employee.contractEndDate ? fmtDate(employee.contractEndDate) : "—"}
        />
        <Field label="Salaire brut mensuel" value={formatFcfa(employee.grossSalary)} />
        <Field label="Salaire net mensuel" value={formatFcfa(employee.netSalary)} />
        <Field label="Mode de paiement" value={employee.paymentMethod} />
      </div>
      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">
          Historique des révisions salariales
        </p>
        {employee.salaryHistory.length === 0 ? (
          <p className="text-sm text-text-tertiary">Aucune révision enregistrée.</p>
        ) : (
          <ul className="relative space-y-4 border-l border-slate-200 pl-4">
            {employee.salaryHistory.map((h, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#2F5F9D] bg-white" />
                <p className="text-[12px] text-text-tertiary">{fmtDate(h.date)}</p>
                <p className="mt-0.5 text-sm text-slate-900">
                  {formatFcfa(h.oldSalary)} → {formatFcfa(h.newSalary)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-[12px] text-text-tertiary">{label}</p>
      <p className="mt-1 text-[14px] text-slate-900">{value}</p>
    </div>
  );
}

function TabDocs({ employee }: { employee: Employee }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Documents</p>
        <ul className="space-y-2">
          {employee.documents.map((doc) => (
            <li
              key={doc.name}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-[#2F5F9D]" />
                <span className="truncate text-sm text-slate-900">{doc.name}</span>
              </div>
              <a
                href={doc.url}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-text-secondary transition hover:bg-slate-100 hover:text-slate-900"
                title="Télécharger"
                onClick={(e) => doc.url.startsWith("#") && e.preventDefault()}
              >
                <Download className="h-4 w-4" />
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">
          Historique des absences
        </p>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-text-tertiary">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Durée</th>
                <th className="px-3 py-2 font-medium text-right">Statut</th>
              </tr>
            </thead>
            <tbody>
              {employee.absences.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-text-tertiary">
                    Aucune absence enregistrée.
                  </td>
                </tr>
              ) : (
                employee.absences.map((a, i) => (
                  <tr
                    key={`${a.date}-${i}`}
                    className={i % 2 === 1 ? "bg-slate-50/80" : "bg-white"}
                  >
                    <td className="px-3 py-2 font-mono text-text-secondary">{fmtDate(a.date)}</td>
                    <td className="px-3 py-2 text-slate-900">{a.type}</td>
                    <td className="px-3 py-2 text-text-secondary">{a.duration} j</td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={
                          a.status === "Approuvé"
                            ? "inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300"
                            : a.status === "Refusé"
                              ? "inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-300"
                              : "inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-200"
                        }
                      >
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
