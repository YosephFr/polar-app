"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircleIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { mascots } from "@/lib/domain/mascots";

export function MascotGrid({ patientId, days, activeMascot }: { patientId: string; days: number; activeMascot: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState(activeMascot);
  const [feedback, setFeedback] = useState("");
  const [pending, startTransition] = useTransition();
  const nextMascot = mascots.find((mascot) => mascot.days > days);

  async function equip(mascotId: string) {
    if (pending || mascotId === selected) return;
    setFeedback("");
    const response = await fetch(`/api/patients/${patientId}/mascot`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mascotId }),
    });
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      setFeedback(body.error || "No se pudo seleccionar la mascota");
      return;
    }
    setSelected(mascotId);
    setFeedback("Mascota seleccionada");
    startTransition(() => router.refresh());
  }

  return (
    <section className="mt-9 rounded-[1.75rem] border border-polar/10 bg-panel p-4 shadow-card sm:p-6">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-black tracking-[-0.025em] text-polar-dark">Bestias de Polar</h2>
          <p className="mt-1 text-sm font-semibold leading-5 text-ink-soft">Se desbloquean al registrar nuevos días.</p>
        </div>
        {nextMascot ? <span className="shrink-0 text-xs font-extrabold text-ink-soft">Próxima: {nextMascot.days} días</span> : null}
      </div>

      <div className="mt-5 grid min-w-0 grid-cols-2 gap-3 min-[520px]:grid-cols-3 md:grid-cols-5">
        {mascots.map((mascot) => {
          const unlocked = days >= mascot.days;
          const active = selected === mascot.id;
          const content = (
            <>
              <div className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-[1rem] p-3 ${unlocked ? "" : "grayscale opacity-35"}`} style={{ backgroundColor: unlocked ? mascot.color : "#cfd5d5" }}>
                <Image src={mascot.src} alt="" width={100} height={100} loading={mascot.days === 0 ? "eager" : "lazy"} fetchPriority={mascot.days === 0 ? "high" : "auto"} className="h-full w-full object-contain" />
                {active ? <CheckCircleIcon size={21} weight="fill" className="absolute right-2 top-2 text-white" /> : !unlocked ? <LockSimpleIcon size={19} weight="fill" className="absolute right-2 top-2 text-ink-soft" /> : null}
              </div>
              <h3 className={`mt-2.5 text-sm font-black leading-4 ${unlocked ? "text-ink" : "text-ink-faint"}`}>{mascot.name}</h3>
              <p className={`mt-1 text-[0.68rem] font-black uppercase tracking-[0.04em] ${active ? "text-polar-dark" : "text-ink-faint"}`}>{active ? "En uso" : mascot.days === 0 ? "Nivel base" : `${mascot.days} días`}</p>
            </>
          );
          return unlocked ? (
            <button key={mascot.id} type="button" aria-pressed={active} disabled={pending} onClick={() => void equip(mascot.id)} className={`relative min-w-0 rounded-[1.25rem] border p-2.5 text-center transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 disabled:opacity-65 ${active ? "border-polar bg-polar-soft shadow-card" : "border-polar/20 bg-panel shadow-field"}`}>
              {content}
            </button>
          ) : (
            <article key={mascot.id} className="relative min-w-0 rounded-[1.25rem] border border-border bg-surface/70 p-2.5 text-center">
              {content}
            </article>
          );
        })}
      </div>
      {feedback ? <p className="mt-4 text-center text-xs font-bold text-polar-dark" role="status">{feedback}</p> : null}
    </section>
  );
}
