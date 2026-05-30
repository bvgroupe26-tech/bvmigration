"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type GlassCardProps = HTMLMotionProps<"div"> & {
  accent?: "blue" | "cyan" | "green" | "amber" | "red" | "violet" | "pink" | "none";
  interactive?: boolean;
};

const ACCENT_BORDER: Record<NonNullable<GlassCardProps["accent"]>, string> = {
  none: "",
  blue: "border-l-[3px] border-l-[#2F5F9D]",
  cyan: "border-l-[3px] border-l-[#1F3F73]",
  green: "border-l-[3px] border-l-emerald-600",
  amber: "border-l-[3px] border-l-[#F2C94C]",
  red: "border-l-[3px] border-l-red-600",
  violet: "border-l-[3px] border-l-[#2F5F9D]",
  pink: "border-l-[3px] border-l-[#2F5F9D]",
};

export default function GlassCard({
  accent = "none",
  interactive = false,
  className,
  children,
  ...rest
}: GlassCardProps) {
  return (
    <motion.div
      className={cn(
        "glass-card relative overflow-hidden",
        interactive && "glass-card-hover cursor-pointer",
        ACCENT_BORDER[accent],
        className
      )}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
