"use client";

import { motion } from "framer-motion";
import {
  Users,
  Calendar,
  DollarSign,
  ClipboardList,
  Target,
  BarChart2,
  type LucideIcon,
} from "lucide-react";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
  border: string;
  hoverGlow: string;
};

const FEATURES: Feature[] = [
  {
    icon: Users,
    title: "Gestion des Employés",
    description:
      "Centralisez tous les profils, contrats et historiques de vos collaborateurs dans une seule plateforme.",
    iconBg: "bg-gradient-to-br from-[#2F5F9D]/20 to-[#2F5F9D]/5",
    iconColor: "text-[#2F5F9D]/80",
    border: "before:bg-[#2F5F9D]",
    hoverGlow: "hover:shadow-[0_20px_60px_-25px_rgba(59,130,246,0.55)]",
  },
  {
    icon: Calendar,
    title: "Présences & Absences",
    description:
      "Suivez en temps réel les présences et gérez les demandes d'absence facilement avec validation en un clic.",
    iconBg: "bg-gradient-to-br from-emerald-500/25 to-emerald-500/5",
    iconColor: "text-emerald-300",
    border: "before:bg-emerald-500",
    hoverGlow: "hover:shadow-[0_20px_60px_-25px_rgba(16,185,129,0.55)]",
  },
  {
    icon: DollarSign,
    title: "Paie Automatisée",
    description:
      "Générez les bulletins de paie en un clic avec calcul automatique des cotisations CNSS et impôts.",
    iconBg: "bg-gradient-to-br from-[#2F5F9D]/15 to-[#1F3F73]/5",
    iconColor: "text-[#2F5F9D]",
    border: "before:bg-[#2F5F9D]",
    hoverGlow: "hover:shadow-[0_20px_60px_-25px_rgba(6,182,212,0.55)]",
  },
  {
    icon: ClipboardList,
    title: "Recrutement",
    description:
      "Pilotez vos campagnes de recrutement et suivez chaque candidature de la réception à l'embauche.",
    iconBg: "bg-gradient-to-br from-amber-500/25 to-amber-500/5",
    iconColor: "text-amber-300",
    border: "before:bg-amber-500",
    hoverGlow: "hover:shadow-[0_20px_60px_-25px_rgba(245,158,11,0.55)]",
  },
  {
    icon: Target,
    title: "Compétences",
    description:
      "Cartographiez les compétences de vos équipes et planifiez les formations pour les développer.",
    iconBg: "bg-gradient-to-br from-[#1F3F73]/15 to-[#1F3F73]/5",
    iconColor: "text-[#1F3F73]",
    border: "before:bg-[#1F3F73]",
    hoverGlow: "hover:shadow-[0_20px_60px_-25px_rgba(139,92,246,0.55)]",
  },
  {
    icon: BarChart2,
    title: "Rapports & Analytics",
    description:
      "Tableaux de bord visuels avec graphiques pour piloter votre stratégie RH avec des décisions data-driven.",
    iconBg: "bg-gradient-to-br from-pink-500/25 to-pink-500/5",
    iconColor: "text-pink-300",
    border: "before:bg-pink-500",
    hoverGlow: "hover:shadow-[0_20px_60px_-25px_rgba(236,72,153,0.55)]",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="relative bg-[#0A0F1E] py-28 px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-14 text-center"
        >
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#2F5F9D]">
            Fonctionnalités
          </p>
          <h2 className="mt-2 font-display text-[36px] font-bold tracking-tight text-white sm:text-[48px]">
            Tout ce dont vous avez besoin
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-text-secondary sm:text-lg">
            Une suite complète d&apos;outils RH conçue pour les entreprises modernes.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15 } } }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={{
                hidden: { opacity: 0, y: 40 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
              }}
              whileHover={{ y: -4 }}
              className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-7 backdrop-blur-sm transition-all before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] ${f.border} ${f.hoverGlow}`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${f.iconBg} ring-1 ring-white/10`}>
                <f.icon className={`h-6 w-6 ${f.iconColor}`} strokeWidth={2.2} />
              </div>
              <h3 className="mt-5 font-display text-xl font-bold text-white">{f.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
                {f.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
