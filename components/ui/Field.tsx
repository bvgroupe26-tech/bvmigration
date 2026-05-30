"use client";

import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from "react";

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

export function Field({ label, hint, error, required, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className="text-[11px] leading-none font-semibold uppercase tracking-wider text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-[11px] font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

const control =
  "rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition bv-control-focus";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn("h-11 w-full", control, className)}
        {...rest}
      />
    );
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 3, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn("min-h-[80px] w-full resize-y py-2", control, className)}
        {...rest}
      />
    );
  }
);

export const NativeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function NativeSelect({ className, children, ...rest }, ref) {
    return (
      <select ref={ref} className={cn("h-10 w-full", control, className)} {...rest}>
        {children}
      </select>
    );
  }
);
