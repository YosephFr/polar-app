"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserCircleIcon } from "@phosphor-icons/react";
import { PolarLogo } from "@/components/brand/polar-logo";
import { Select } from "@/components/ui/field";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { usePolar } from "./app-context";
import { mascotById } from "@/lib/domain/mascots";

export function AppHeader() {
  const { patients, patient } = usePolar();
  const mascot = mascotById(patient.activeMascot);
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
    <header className="sticky top-0 z-40 w-full bg-transparent px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] sm:px-5">
      <div
        className={`mx-auto flex w-full max-w-6xl items-center gap-3 rounded-[1.5rem] border bg-panel px-3 transition-[min-height,border-color,box-shadow] duration-300 sm:px-4 ${scrolled ? "min-h-[3.75rem] border-border shadow-float" : "min-h-16 border-polar/10 shadow-card"}`}
      >
        <Link href="/" className="flex shrink-0 rounded-xl" aria-label="Inicio de Polar">
          <PolarLogo stacked />
        </Link>

        <div className="ml-auto flex min-w-0 items-center justify-end gap-2">
          <Select
            aria-label="Perfil activo"
            value={patient.id}
            disabled={switching}
            onValueChange={switchPatient}
            compact
            fitContent
            showIndicator={false}
            leading={<span className="flex size-7 items-center justify-center rounded-full bg-polar-soft"><Image src={mascot.src} alt="" width={23} height={23} className="size-[1.35rem] object-contain" /></span>}
            className="max-w-[10.5rem] rounded-full border-polar/20 bg-surface py-0 pl-2 pr-3 text-[0.93rem] font-black shadow-none"
          >
            {patients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <NotificationBell />
          <Link
            href="/perfil"
            aria-label="Abrir perfil"
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-polar/15 bg-polar-soft text-polar transition-[transform,background-color] duration-200 hover:bg-surface-strong active:scale-95"
          >
            <UserCircleIcon size={25} weight="fill" />
          </Link>
        </div>
      </div>
    </header>
  );
}
