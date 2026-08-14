"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Bell, CalendarPlus, Check, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
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

  const sortedAppointments = useMemo(() => [...appointments].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)), [appointments]);

  async function createTimer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const minutes = Number(form.get("minutes"));
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/timers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: patient.id, label: String(form.get("label")), dueAt: new Date(Date.now() + minutes * 60000).toISOString() }) });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) setMessage(body.error || "No se pudo iniciar el temporizador");
      else { event.currentTarget.reset(); setMessage("Temporizador iniciado"); router.refresh(); }
    } catch { setMessage("Revise la conexión e inténtelo de nuevo"); }
    finally { setBusy(false); }
  }

  async function createAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const scheduled = String(form.get("scheduledAt"));
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: patient.id, title: String(form.get("title")), scheduledAt: new Date(scheduled).toISOString(), notes: String(form.get("notes") || "").trim() || null }) });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) setMessage(body.error || "No se pudo guardar la cita");
      else { event.currentTarget.reset(); setMessage("Cita guardada"); router.refresh(); }
    } catch { setMessage("Revise la fecha y la conexión"); }
    finally { setBusy(false); }
  }

  async function completeTimer(id: string) {
    await fetch(`/api/timers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "done" }) });
    router.refresh();
  }

  async function requestNotifications() {
    if (!("Notification" in window)) { setMessage("Este navegador no admite notificaciones"); return; }
    const permission = await Notification.requestPermission();
    setMessage(permission === "granted" ? "Notificaciones activadas" : "Las notificaciones no están habilitadas");
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4"><div><h1 className="text-3xl font-extrabold tracking-[-0.04em]">Agenda</h1><p className="mt-2 text-sm font-semibold text-ink-soft">Temporizadores y próximas citas de {patient.name}.</p></div><button type="button" onClick={requestNotifications} aria-label="Activar notificaciones" className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-polar"><Bell size={21} /></button></div>

      {timers.length > 0 ? <section className="mt-7"><h2 className="text-lg font-extrabold text-polar-dark">Temporizadores activos</h2><div className="mt-3 flex flex-col gap-3">{timers.map((timer) => <article key={timer.id} className="flex items-center gap-4 rounded-lg bg-polar-soft px-4 py-4"><TimerReset className="shrink-0 text-polar" size={24} /><div className="min-w-0 flex-1"><h3 className="truncate font-extrabold">{timer.label}</h3><p className="tnum mt-0.5 text-sm font-bold text-polar-dark">{remainingLabel(timer.dueAt, now)}</p></div><button type="button" onClick={() => completeTimer(timer.id)} aria-label="Marcar como hecho" className="flex size-10 items-center justify-center rounded-full bg-white text-polar"><Check size={20} /></button></article>)}</div></section> : null}

      <section className="mt-8"><h2 className="text-lg font-extrabold text-polar-dark">Nuevo temporizador</h2><form onSubmit={createTimer} className="mt-4 grid grid-cols-[1fr_7rem] gap-3"><Field label="Recordatorio" htmlFor="timer-label"><Input id="timer-label" name="label" required placeholder="Volver a medir" /></Field><Field label="En minutos" htmlFor="timer-minutes"><Input id="timer-minutes" name="minutes" type="number" inputMode="numeric" min="1" max="1440" defaultValue="15" required /></Field><Button type="submit" loading={busy} icon={<TimerReset size={19} />} className="col-span-2">Iniciar</Button></form></section>

      <section className="mt-9 border-t border-border pt-7"><h2 className="text-lg font-extrabold text-polar-dark">Próximas citas</h2>{sortedAppointments.length ? <div className="mt-3 flex flex-col gap-2">{sortedAppointments.map((item) => <article key={item.id} className="border-b border-border py-3"><p className="font-extrabold">{item.title}</p><p className="mt-1 text-sm font-bold text-polar">{new Date(item.scheduledAt).toLocaleString("es-419", { dateStyle: "long", timeStyle: "short" })}</p>{item.notes ? <p className="mt-1 text-sm text-ink-soft">{item.notes}</p> : null}</article>)}</div> : <p className="mt-3 rounded-lg bg-surface px-4 py-5 text-sm font-semibold text-ink-soft">No hay citas próximas.</p>}
        <form onSubmit={createAppointment} className="mt-6 flex flex-col gap-4"><Field label="Título" htmlFor="appointment-title"><Input id="appointment-title" name="title" required placeholder="Control con el equipo" /></Field><Field label="Fecha y hora" htmlFor="appointment-date"><Input id="appointment-date" name="scheduledAt" type="datetime-local" required /></Field><Field label="Nota opcional" htmlFor="appointment-notes"><Textarea id="appointment-notes" name="notes" /></Field><Button type="submit" loading={busy} icon={<CalendarPlus size={19} />}>Guardar cita</Button></form>
      </section>
      {message ? <p className="mt-5 rounded-md bg-surface px-4 py-3 text-sm font-bold" role="status">{message}</p> : null}
    </div>
  );
}
