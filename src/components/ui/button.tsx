import { CircleNotchIcon } from "@phosphor-icons/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

const variants = {
  primary: "border-polar bg-polar text-on-accent shadow-action hover:bg-polar-dark active:bg-polar-dark",
  secondary: "border-border-strong bg-panel text-ink shadow-field hover:border-polar/45 hover:bg-surface active:bg-surface-strong",
  danger: "border-danger bg-danger text-on-accent shadow-field hover:bg-danger/90",
  ghost: "border-transparent bg-transparent text-polar hover:bg-polar-soft active:bg-polar-soft",
};

export function Button({
  loading = false,
  icon,
  variant = "primary",
  className = "",
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`relative inline-flex min-h-13 min-w-0 items-center justify-center gap-2.5 rounded-[1.125rem] border px-5 text-base font-extrabold transition-[transform,background-color,border-color,box-shadow] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55 ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? <CircleNotchIcon size={21} weight="bold" className="animate-spin" /> : icon}
      {loading ? <span className="sr-only">Cargando</span> : children}
    </button>
  );
}
