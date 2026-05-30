"use client";

import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

type BaseProps = {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  children?: ReactNode;
  loading?: boolean;
  full?: boolean;
};

type ButtonProps = BaseProps &
  Omit<HTMLMotionProps<"button">, "ref"> & {
    asLink?: false;
  };

const VARIANTS: Record<Variant, string> = {
  primary:
    "glow-button text-white font-semibold border-0 shadow-sm",
  secondary:
    "bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-medium shadow-sm",
  ghost:
    "bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-transparent",
  danger:
    "bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 font-medium",
  success:
    "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-medium",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-12 px-5 text-sm rounded-xl gap-2",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    icon,
    iconRight,
    children,
    loading = false,
    full = false,
    className,
    disabled,
    ...rest
  },
  ref
) {
  return (
    <motion.button
      ref={ref}
      whileHover={{ scale: disabled ? 1 : 1.01 }}
      whileTap={{ scale: disabled ? 1 : 0.99 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className={cn(
        "inline-flex items-center justify-center font-sans transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        full && "w-full",
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon
      )}
      {children}
      {iconRight}
    </motion.button>
  );
});

export default Button;
