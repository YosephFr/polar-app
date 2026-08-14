"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BellIcon, CalendarPlusIcon, CheckIcon, TimerIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import type { Appointment, PatientTimer } from "@/lib/db/data";
import { usePolar } from "@/components/app/app-context";

function remainingLabel(dueAt: string, now: number) {
  const distance = new Date(dueAt).getTime() - now;
  if (distance <= 0) return "Ahora";
  const minutes = Math.ceil(distance / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} h ${rest ? `${rest} min` : ""}`.trim();
}

export function AgendaClient({ appointments, timers, initialNow }: { appointments: Appointment[]; timers: PatientTimer[]; initialNow: number }) {
  const { patient } = usePolar();
  const router = useRouter();
  const [now, setNow] = useState(initialNow);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const notified = useRef(new Set<string>());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    for (const timer of timers) {
      if (new Date(timer.dueAt).getTime() <= now && !notified.current.has(timer.id)) {
        notified.current.add(timer.id);
        new Notification("Polar", { body: timer.label, icon: "/icons/icon-192.png", tag: timer.id });
      }
    }
  }, [now, timers]);

  const sortedAppointments = useMemo(
    () => [...appointments].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [appointments],
  );

  async function createTimer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const minutes = Number(form.get("minutes"));
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/timers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          label: String(form.get("label")),
          dueAt: new Date(Date.now() + minutes * 60000).toISOString(),
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) setMessage(body.error || "No se pudo iniciar el temporizador");
      else {
        event.currentTarget.reset();
        setMessage("Temporizador iniciado");
        router.refresh();
      }
    } catch {
      setMessage("Revise la conexión e inténtelo de nuevo");
    } finally {
      setBusy(false);
    }
  }

  async function createAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const scheduled = String(form.get("scheduledAt"));
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          title: String(form.get("title")),
          scheduledAt: new Date(scheduled).toISOString(),
          notes: String(form.get("notes") || "").trim() || null,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) setMessage(body.error || "No se pudo guardar la cita");
      else {
        event.currentTarget.reset();
        setMessage("Cita guardada");
        router.refresh();
      }
    } catch {
      setMessage("Revise la fecha y la conexión");
    } finally {
      setBusy(false);
    }
  }

  async function completeTimer(id: string) {
    await fetch(`/api/timers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    router.refresh();
  }

  async function requestNotifications() {
    if (!("Notification" in window)) {
      setMessage("Este navegador no admite notificaciones");
      return;
    }
    const permission = await Notification.requestPermission();
    setMessage(permission === "granted" ? "Notificaciones activadas" : "Las notificaciones no están habilitadas");
  }

  return (
    <div className="min-w-0">
      <PageHeader
        title="Agenda"
        subtitle={patient.name}
        action={(
          <button
            type="button"
            onClick={requestNotifications}
            aria-label="Activar notificaciones"
            className="flex size-12 shrink-0 items-center justify-center rounded-[1rem] border border-polar/15 bg-polar-soft text-polar transition-transform active:scale-95"
          >
            <BellIcon size={23} weight="duotone" />
          </button>
        )}
      />

      {timers.length > 0 ? (
        <section className="mt-7">
          <h2 className="text-lg font-black text-polar-dark">Temporizadores activos</h2>
          <div className="mt-3 flex flex-col gap-3">
            {timers.map((timer) => (
              <article key={timer.id} className="flex min-w-0 items-center gap-3 rounded-[1.35rem] bg-polar px-4 py-4 text-on-accent shadow-action sm:gap-4">
                <TimerIcon className="shrink-0" size={25} weight="duotone" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-black">{timer.label}</h3>
                  <p className="tnum mt-0.5 text-sm font-extrabold text-on-accent/80">{remainingLabel(timer.dueAt, now)}</p>
                </div>
                <button type="button" onClick={() => completeTimer(timer.id)} aria-label="Marcar como hecho" className="flex size-11 shrink-0 items-center justify-center rounded-[0.95rem] bg-panel text-polar transition-transform active:scale-95">
                  <CheckIcon size={21} weight="bold" />
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-7 rounded-[1.5rem] border border-polar/10 bg-panel p-4 shadow-card sm:p-6">
        <h2 className="text-lg font-black text-polar-dark">Nuevo temporizador</h2>
        <form onSubmit={createTimer} className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(6.5rem,7rem)] gap-3 max-[350px]:grid-cols-1">
          <Field label="Recordatorio" htmlFor="timer-label">
            <Input id="timer-label" name="label" required placeholder="Volver a medir" />
          </Field>
          <Field label="En minutos" htmlFor="timer-minutes">
            <Input id="timer-minutes" name="minutes" type="number" inputMode="numeric" min="1" max="1440" defaultValue="15" required />
          </Field>
          <Button type="submit" loading={busy} icon={<TimerIcon size={20} weight="bold" />} className="col-span-full min-h-14">Iniciar</Button>
        </form>
      </section>

      <section className="mt-7 rounded-[1.5rem] border border-polar/10 bg-panel p-4 shadow-card sm:p-6">
        <h2 className="text-lg font-black text-polar-dark">Próximas citas</h2>
        {sortedAppointments.length ? (
          <div className="mt-3 divide-y divide-border">
            {sortedAppointments.map((item) => (
              <article key={item.id} className="min-w-0 py-4">
                <p className="truncate font-black">{item.title}</p>
                <p className="mt-1 text-sm font-extrabold text-polar">{new Date(item.scheduledAt).toLocaleString("es-419", { dateStyle: "long", timeStyle: "short" })}</p>
                {item.notes ? <p className="mt-1 text-sm font-semibold leading-5 text-ink-soft">{item.notes}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-[1.15rem] bg-surface px-4 py-5 text-sm font-bold text-ink-soft">No hay citas próximas.</p>
        )}

        <form onSubmit={createAppointment} className="mt-6 flex min-w-0 flex-col gap-4">
          <Field label="Título" htmlFor="appointment-title">
            <Input id="appointment-title" name="title" required placeholder="Control con el equipo" />
          </Field>
          <Field label="Fecha y hora" htmlFor="appointment-date">
            <Input id="appointment-date" name="scheduledAt" type="datetime-local" required />
          </Field>
          <Field label="Nota opcional" htmlFor="appointment-notes">
            <Textarea id="appointment-notes" name="notes" />
          </Field>
          <Button type="submit" loading={busy} icon={<CalendarPlusIcon size={21} weight="bold" />} className="min-h-14">Guardar cita</Button>
        </form>
      </section>

      {message ? <p className="page-enter mt-5 rounded-[1.15rem] bg-surface px-4 py-3 text-sm font-extrabold" role="status">{message}</p> : null}
    </div>
  );
}
