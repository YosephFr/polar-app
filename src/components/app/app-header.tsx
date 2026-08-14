"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserCircleIcon } from "@phosphor-icons/react";
import { PolarLogo, PolarMark } from "@/components/brand/polar-logo";
import { Select } from "@/components/ui/field";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { usePolar } from "./app-context";

export function AppHeader() {
  const { patients, patient } = usePolar();
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [scrolled, setScrolled] = useState(false);
  const switching = sending || refreshing;

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 12);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  async function switchPatient(patientId: string) {
    if (patientId === patient.id || switching) return;
    setSending(true);
    try {
      const response = await fetch("/api/patients/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      if (response.ok) startRefresh(() => router.refresh());
    } finally {
      setSending(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-canvas/95 px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] sm:px-5">
      <div
        className={`mx-auto flex w-full max-w-6xl items-center gap-2.5 rounded-[1.65rem] border bg-panel px-3 transition-[min-height,border-color,box-shadow] duration-300 sm:gap-4 sm:px-5 ${scrolled ? "min-h-16 border-border shadow-float" : "min-h-[4.75rem] border-polar/10 shadow-card"}`}
      >
        <Link href="/" className="shrink-0 rounded-lg" aria-label="Inicio de Polar">
          <PolarLogo responsive />
        </Link>

        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2.5 sm:gap-3">
          <div className="min-w-0 flex-1 sm:max-w-[18rem]">
            <Select
              aria-label="Perfil activo"
              value={patient.id}
              disabled={switching}
              onValueChange={switchPatient}
              leading={<PolarMark size={29} />}
              className="min-h-12 border-polar/20 bg-canvas px-3 text-base font-black shadow-none sm:px-4"
            >
              {patients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
          </div>
          <NotificationBell />
          <Link
            href="/perfil"
            aria-label="Abrir perfil"
            className="flex size-12 shrink-0 items-center justify-center rounded-[1rem] border border-polar/15 bg-polar-soft text-polar transition-[transform,background-color] duration-200 hover:bg-surface-strong active:scale-95"
          >
            <UserCircleIcon size={27} weight="bold" />
          </Link>
        </div>
      </div>
    </header>
  );
}
