"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { formatFCFA, formatNumber } from "@/lib/utils";

type AnimatedCounterProps = {
  to: number;
  format?: "number" | "currency" | "percent";
  suffix?: string;
  duration?: number;
  className?: string;
};

export default function AnimatedCounter({
  to,
  format = "number",
  suffix,
  duration = 2000,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { duration, bounce: 0 });
  const display = useTransform(spring, (v) => {
    if (format === "currency") return formatFCFA(v);
    if (format === "percent") return `${v.toFixed(1)}%`;
    return formatNumber(Math.round(v));
  });
  const [text, setText] = useState<string>(() => {
    if (format === "currency") return formatFCFA(0);
    if (format === "percent") return "0%";
    return "0";
  });

  useEffect(() => {
    if (reduce) {
      motionVal.set(to);
      if (format === "currency") setText(formatFCFA(to));
      else if (format === "percent") setText(`${to.toFixed(1)}%`);
      else setText(formatNumber(to));
      return;
    }
    if (inView) motionVal.set(to);
  }, [inView, motionVal, to, reduce, format]);

  useEffect(() => {
    const unsub = display.on("change", (v) => setText(v));
    return () => unsub();
  }, [display]);

  return (
    <motion.span ref={ref} className={className}>
      {text}
      {suffix && <span className="ml-1 text-base font-medium text-text-secondary">{suffix}</span>}
    </motion.span>
  );
}
