"use client";

import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
};

export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-slate-100 via-slate-200/80 to-slate-100 bg-[length:200%_100%]",
        className
      )}
      style={{ animation: "skeleton-shimmer 1.4s ease-in-out infinite" }}
    />
  );
}
