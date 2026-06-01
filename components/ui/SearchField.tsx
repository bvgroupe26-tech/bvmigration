"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  wrapperClassName?: string;
};

export default function SearchField({
  className,
  wrapperClassName,
  ...props
}: SearchFieldProps) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
      <input
        type="search"
        className={cn(
          "h-10 w-full rounded-xl border border-slate-200 bg-white py-0 pl-10 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-[#2F5F9D] focus:outline-none focus:ring-2 focus:ring-[#E8F0FA]",
          className
        )}
        {...props}
      />
    </div>
  );
}
