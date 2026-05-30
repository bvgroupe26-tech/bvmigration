"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption<T extends string | number = string> = {
  value: T;
  label: string;
  description?: string;
};

type SelectProps<T extends string | number> = {
  value: T;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  placeholder?: string;
  className?: string;
  size?: "sm" | "md";
  icon?: React.ReactNode;
};

export default function Select<T extends string | number>({
  value,
  options,
  onChange,
  placeholder,
  className,
  size = "md",
  icon,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50",
          size === "sm" ? "h-9 text-xs" : "h-10",
          open && "border-[#2F5F9D] ring-2 ring-[#E8F0FA]"
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {icon}
          {selected ? selected.label : <span className="text-slate-400">{placeholder}</span>}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-500 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
                    isSelected
                      ? "bg-[#E8F0FA] text-[#1F3F73]"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{opt.label}</span>
                    {opt.description && (
                      <span className="truncate text-[11px] text-slate-500">
                        {opt.description}
                      </span>
                    )}
                  </span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-[#2F5F9D]" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
