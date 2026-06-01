"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

type ChartContainerProps = {
  height: number;
  minWidth?: number;
  className?: string;
  children: ReactElement;
};

/**
 * Évite les warnings Recharts width(-1)/height(-1) : ne monte le graphique
 * qu'une fois le conteneur mesuré (ResizeObserver).
 */
export default function ChartContainer({
  height,
  minWidth = 1,
  className,
  children,
}: ChartContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const { width, height: h } = el.getBoundingClientRect();
      const w = Math.floor(width);
      const floorH = Math.floor(h);
      if (w > 0 && floorH > 0) {
        setSize({ width: w, height: floorH });
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("w-full min-w-0", className)}
      style={{ height, minHeight: height, minWidth }}
    >
      {size ? (
        <ResponsiveContainer width={size.width} height={size.height}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
