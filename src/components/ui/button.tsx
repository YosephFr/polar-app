import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

const variants = {
  primary: "bg-polar text-white border-polar active:bg-polar-dark",
  secondary: "bg-white text-ink border-border-strong active:bg-surface",
  danger: "bg-danger text-white border-danger",
  ghost: "bg-transparent text-polar border-transparent active:bg-polar-soft",
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
      className={`relative inline-flex min-h-12 items-center justify-center gap-2 rounded-md border px-5 text-base font-bold transition-[transform,background-color,border-color] duration-150 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-55 ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? <span className="size-5 animate-spin rounded-full border-2 border-current border-r-transparent" /> : icon}
      {loading ? <span className="sr-only">Cargando</span> : children}
    </button>
  );
}

