"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { isNavActive, type NavItem } from "@/lib/nav-config";

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  title?: string;
};

export default function MobileNavDrawer({
  open,
  onClose,
  items,
  title = "Menu",
}: MobileNavDrawerProps) {
  const pathname = usePathname() || "/";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-[2px] lg:hidden"
            aria-label="Fermer le menu"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-[61] max-h-[min(70dvh,520px)] overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl lg:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="font-display text-lg font-bold text-slate-900">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="overflow-y-auto px-3 py-3 pb-6">
              {items.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition",
                        active
                          ? "bg-[#E8F0FA] text-[#1F3F73]"
                          : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", active ? "text-[#2F5F9D]" : "text-slate-400")} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
