"use client";

import Link from "next/link";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { Building2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#features", label: "Fonctionnalités" },
  { href: "#preview", label: "Aperçu" },
  { href: "#stats", label: "Chiffres" },
  { href: "#cta", label: "À propos" },
];

export default function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (v) => {
    setScrolled(v > 50);
  });

  return (
    <motion.nav
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-white/10 bg-[#0A0F1E]/90 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#2F5F9D] to-[#1F3F73] shadow-md transition group-hover:shadow-lg">
            <Building2 className="h-6 w-6 text-white" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-[17px] font-bold tracking-tight text-white">
              BV GROUPE
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2F5F9D]">
              Gestion RH
            </span>
          </div>
        </Link>

        <ul className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-text-secondary transition hover:bg-white/5 hover:text-white"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Link
            href="/register"
            className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-white/90 ring-1 ring-white/20 transition hover:bg-white/10 sm:inline-flex"
          >
            S&apos;inscrire
          </Link>
          <Link
            href="/login"
            className="group relative inline-flex h-11 items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#2F5F9D] to-[#1F3F73] px-5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative">Se connecter</span>
            <ArrowRight className="relative h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
