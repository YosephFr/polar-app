"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowCounterClockwiseIcon,
  CheckIcon,
  DotsThreeIcon,
  PauseIcon,
  PlayIcon,
  TimerIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/field";
import { useNotificationCenter } from "@/components/notifications/notification-center-provider";

function statusAt(dueAt: string, status: string, now: number) {
  return status === "active" && new Date(dueAt).getTime() <= now ? "due" : status;
}

function remainingLabel(dueAt: string, status: string, remainingSeconds: number | null, now: number) {
  const seconds = status === "paused"
    ? Math.max(0, remainingSeconds || 0)
    : Math.max(0, Math.ceil((new Date(dueAt).getTime() - now) / 1000));
  if (status === "due" || seconds === 0) return "Necesita atención";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const clock = hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
    : `${minutes}:${String(rest).padStart(2, "0")}`;
  return status === "paused" ? `En pausa · ${clock}` : clock;
}

export function TimerList({ onFeedback }: { onFeedback: (message: string, tone: "success" | "error" | "info") => void }) {
  const { snapshot, now, refresh } = useNotificationCenter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, action: string, extra: Record<string, unknown> = {}) {
    setBusy(`${action}:${id}`);
    try {
      const response = await fetch(`/api/timers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        onFeedback(body.error || "No se pudo actualizar el temporizador", "error");
        return;
      }
      onFeedback(action === "done" ? "Temporizador completado" : action === "cancel" ? "Temporizador eliminado" : "Temporizador actualizado", "success");
      await refresh();
    } catch {
      onFeedback("Revise la conexión e inténtelo de nuevo", "error");
    } finally {
      setBusy(null);
    }
  }

  function update(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const label = String(form.get("label") || "").trim();
    const minutes = Number(form.get("minutes") || 0);
    void act(id, "update", { label, minutes });
  }

  if (!snapshot.timers.length) return null;

  return (
    <section className="mt-7">
      <h2 className="text-lg font-black text-polar-dark">Temporizadores activos</h2>
      <div className="mt-3 flex flex-col gap-3">
        {snapshot.timers.map((timer) => {
          const status = statusAt(timer.dueAt, timer.status, now);
          const pending = busy?.endsWith(`:${timer.id}`);
          return (
            <article key={timer.id} className={`min-w-0 overflow-hidden rounded-[1.35rem] border shadow-card ${status === "due" ? "border-danger/25 bg-danger-soft" : "border-polar/10 bg-panel"}`}>
              <div className="flex min-w-0 items-center gap-3 px-4 py-4">
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-[0.95rem] ${status === "due" ? "bg-danger text-white" : "bg-polar text-white"}`}>
                  <TimerIcon size={22} weight="duotone" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-black text-ink">{timer.label}</h3>
                  <p className={`tnum mt-0.5 text-sm font-extrabold ${status === "due" ? "text-danger" : "text-polar-dark"}`}>{remainingLabel(timer.dueAt, status, timer.remainingSeconds, now)}</p>
                </div>
                <button type="button" disabled={pending} onClick={() => void act(timer.id, status === "paused" ? "resume" : "pause")} aria-label={status === "paused" ? "Reanudar" : "Pausar"} className="flex size-11 shrink-0 items-center justify-center rounded-[0.9rem] bg-surface text-polar active:scale-95 disabled:opacity-45">
                  {status === "paused" ? <PlayIcon size={20} weight="fill" /> : <PauseIcon size={20} weight="fill" />}
                </button>
                <button type="button" disabled={pending} onClick={() => void act(timer.id, "done")} aria-label="Marcar como realizado" className="flex size-11 shrink-0 items-center justify-center rounded-[0.9rem] bg-polar text-white active:scale-95 disabled:opacity-45">
                  <CheckIcon size={20} weight="bold" />
                </button>
              </div>
              <details className="group border-t border-border/70">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-xs font-black text-ink-soft [&::-webkit-details-marker]:hidden">
                  <DotsThreeIcon size={21} weight="bold" />
                  <span>Más opciones</span>
                </summary>
                <div className="border-t border-border/70 px-4 pb-4 pt-3">
                  <div className="flex flex-wrap gap-2">
                    {[15, 120].map((minutes) => (
                      <button key={minutes} type="button" disabled={pending} onClick={() => void act(timer.id, "restart", { minutes })} className="inline-flex min-h-10 items-center gap-1.5 rounded-[0.8rem] bg-surface px-3 text-xs font-black text-polar-dark">
                        <ArrowCounterClockwiseIcon size={16} weight="bold" />{minutes === 120 ? "2 horas" : `${minutes} min`}
                      </button>
                    ))}
                    <button type="button" disabled={pending} onClick={() => void act(timer.id, "cancel")} className="inline-flex min-h-10 items-center gap-1.5 px-2 text-xs font-black text-danger">
                      <TrashIcon size={16} weight="bold" />Eliminar
                    </button>
                  </div>
                  <form onSubmit={(event) => update(event, timer.id)} className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_6rem] gap-2">
                    <Input name="label" aria-label="Nombre del temporizador" minLength={2} maxLength={120} required defaultValue={timer.label} className="min-h-11 rounded-[0.85rem]" />
                    <Input name="minutes" aria-label="Minutos" type="number" min="1" max="1440" required defaultValue="15" className="min-h-11 rounded-[0.85rem]" />
                    <button type="submit" disabled={pending} className="col-span-full min-h-10 rounded-[0.8rem] bg-polar px-3 text-xs font-black text-white disabled:opacity-45">Guardar cambios</button>
                  </form>
                </div>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}
