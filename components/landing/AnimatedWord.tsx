"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const WORDS: Array<{ text: string; gradient: string }> = [
  { text: "intelligence", gradient: "from-[#2F5F9D] to-[#1F3F73]" },
  { text: "précision", gradient: "from-[#2F5F9D] to-[#1F3F73]" },
  { text: "efficacité", gradient: "from-[#1F3F73] to-[#2F5F9D]" },
  { text: "simplicité", gradient: "from-[#2F5F9D] to-emerald-600" },
];

export default function AnimatedWord() {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % WORDS.length);
    }, 2500);
    return () => window.clearInterval(id);
  }, [reduce]);

  const current = WORDS[index];

  return (
    <span className="relative inline-block min-w-[260px] sm:min-w-[400px] align-baseline">
      <AnimatePresence mode="wait">
        <motion.span
          key={current.text}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -24 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className={`inline-block bg-gradient-to-r ${current.gradient} bg-clip-text text-transparent`}
          style={{ paddingBottom: "0.08em" }}
        >
          {current.text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
