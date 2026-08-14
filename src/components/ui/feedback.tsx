"use client";

import { CheckCircleIcon, InfoIcon, WarningCircleIcon, XIcon } from "@phosphor-icons/react";

type Tone = "success" | "error" | "info";

const tones = {
  success: "border-success/20 bg-success-soft text-success",
  error: "border-danger/20 bg-danger-soft text-danger",
  info: "border-polar/20 bg-polar-soft text-polar-dark",
};

export function Notice({ message, tone = "info", className = "" }: { message: string; tone?: Tone; className?: string }) {
  const Icon = tone === "success" ? CheckCircleIcon : tone === "error" ? WarningCircleIcon : InfoIcon;
  return (
    <div className={`page-enter flex items-start gap-3 rounded-[1.15rem] border px-4 py-3.5 text-sm font-extrabold leading-5 ${tones[tone]} ${className}`} role={tone === "error" ? "alert" : "status"}>
      <Icon size={21} weight="fill" className="mt-px shrink-0" />
      <span className="min-w-0 flex-1">{message}</span>
    </div>
  );
}

export function Toast({ message, tone = "success", onDismiss }: { message: string; tone?: Tone; onDismiss: () => void }) {
  const Icon = tone === "success" ? CheckCircleIcon : tone === "error" ? WarningCircleIcon : InfoIcon;
  return (
    <div className="page-enter fixed inset-x-4 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] z-[65] mx-auto flex max-w-md items-center gap-3 rounded-[1.35rem] border border-border bg-ink px-4 py-3.5 text-on-accent shadow-float" role={tone === "error" ? "alert" : "status"}>
      <Icon size={22} weight="fill" className="shrink-0 text-on-accent" />
      <span className="min-w-0 flex-1 text-sm font-extrabold">{message}</span>
      <button type="button" onClick={onDismiss} aria-label="Cerrar mensaje" className="flex size-9 shrink-0 items-center justify-center rounded-[0.75rem] text-on-accent/75 hover:bg-white/10">
        <XIcon size={18} weight="bold" />
      </button>
    </div>
  );
}
