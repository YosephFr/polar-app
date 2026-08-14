import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[2rem] font-black leading-tight tracking-[-0.04em] text-ink sm:text-[2.25rem]">{title}</h1>
        {subtitle ? <p className="mt-1.5 truncate text-sm font-bold text-ink-soft sm:text-base">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
