"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, UserRound } from "lucide-react";
import { PolarLogo, PolarMark } from "@/components/brand/polar-logo";
import { usePolar } from "./app-context";

export function AppHeader() {
  const { patients, patient } = usePolar();
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  async function switchPatient(patientId: string) {
    if (patientId === patient.id) return;
    setSwitching(true);
    try {
      const response = await fetch("/api/patients/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      if (response.ok) router.refresh();
    } finally {
      setSwitching(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/95 pt-safe">
      <div className="mx-auto flex h-[5.25rem] max-w-3xl items-center gap-3 px-5">
        <Link href="/" className="shrink-0 rounded-md" aria-label="Inicio de Polar">
          <PolarLogo compact={false} />
        </Link>
        <div className="relative ml-auto min-w-0 max-w-[12.5rem] flex-1 sm:ml-8 sm:max-w-[16rem]">
          <PolarMark size={30} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-polar" />
          <select
            aria-label="Perfil activo"
            value={patient.id}
            disabled={switching}
            onChange={(event) => switchPatient(event.target.value)}
            className="h-12 w-full appearance-none truncate rounded-xl border border-border bg-white py-0 pl-12 pr-10 text-base font-bold text-ink outline-none transition-colors focus:border-polar disabled:opacity-60"
          >
            {patients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <ChevronDown size={19} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink" />
        </div>
        <Link href="/perfil" aria-label="Abrir perfil" className="flex size-12 shrink-0 items-center justify-center rounded-full border border-border text-polar transition-colors active:bg-polar-soft">
          <UserRound size={23} />
        </Link>
      </div>
    </header>
  );
}
