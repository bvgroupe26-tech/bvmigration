"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, ArrowRight } from "lucide-react";

export default function CTASection() {
  return (
    <section id="cta" className="relative overflow-hidden bg-gradient-to-b from-[#0A0F1E] via-[#1A2235] to-[#0A0F1E] py-32 px-6 lg:px-8">
      {/* Glow central */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(59,130,246,0.2), rgba(6,182,212,0.1) 60%, transparent 80%)",
          filter: "blur(50px)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-3xl text-center"
      >
        <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2F5F9D] to-[#1F3F73] shadow-lg">
          <Building2 className="h-10 w-10 text-white" strokeWidth={2.2} />
        </div>

        <h2 className="mt-8 font-display text-[36px] font-bold leading-tight tracking-tight text-white sm:text-[52px]">
          Prêt à transformer votre <br />
          <span className="bg-gradient-to-r from-[#2F5F9D] via-[#2F5F9D] to-[#F2C94C] bg-clip-text text-transparent">
            gestion RH ?
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base text-text-secondary sm:text-lg">
          Accédez dès maintenant à votre espace BV GROUPE et reprenez le contrôle de votre activité RH.
        </p>

        <Link
          href="/login?next=/dashboard"
          className="group relative mt-9 inline-flex h-14 items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-[#2F5F9D] to-[#1F3F73] px-8 text-base font-semibold text-white shadow-lg transition hover:scale-[1.04] hover:shadow-xl"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          <span className="relative">Accéder au tableau de bord</span>
          <ArrowRight className="relative h-5 w-5 transition group-hover:translate-x-1" />
        </Link>

        <p className="mt-6 text-xs text-text-tertiary">
          🔒 Sécurisé — Données chiffrées localement
        </p>
      </motion.div>
    </section>
  );
}
