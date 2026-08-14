"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BellIcon, CalendarPlusIcon, CheckIcon, TimerIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Toast } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { clearFieldError, focusFirstError, validateForm, type ApiProblem, type FieldErrors } from "@/lib/client/form-validation";
import { formatPolarDateTime } from "@/lib/date-time";
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
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [refreshing, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ text: string; tone: "success" | "error" | "info" } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
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

  function clearError(name: string) {
    setFeedback(null);
    setFieldErrors((current) => clearFieldError(current, name));
  }

  async function createTimer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const validation = validateForm(formElement);
    if (Object.keys(validation).length > 0) {
      setFieldErrors((current) => ({ ...current, ...validation }));
      setFeedback({ text: "Revise los campos del temporizador", tone: "error" });
      focusFirstError(formElement, validation);
      return;
    }
    const form = new FormData(formElement);
    const minutes = Number(form.get("minutes"));
    setBusyAction("timer");
    setFeedback(null);
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
      const body = (await response.json()) as ApiProblem;
      if (!response.ok) {
        const nextErrors = { ...(body.fieldErrors || {}) };
        if (nextErrors.dueAt) {
          nextErrors.minutes = nextErrors.dueAt;
          delete nextErrors.dueAt;
        }
        setFieldErrors((current) => ({ ...current, ...nextErrors }));
        setFeedback({ text: body.error || "No se pudo iniciar el temporizador", tone: "error" });
        focusFirstError(formElement, nextErrors);
      } else {
        formElement.reset();
        setFieldErrors({});
        setFeedback({ text: "Temporizador iniciado", tone: "success" });
        startTransition(() => router.refresh());
      }
    } catch {
      setFeedback({ text: "Revise la conexión e inténtelo de nuevo", tone: "error" });
    } finally {
      setBusyAction(null);
    }
  }

  async function createAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const validation = validateForm(formElement);
    if (Object.keys(validation).length > 0) {
      setFieldErrors((current) => ({ ...current, ...validation }));
      setFeedback({ text: "Revise los campos de la cita", tone: "error" });
      focusFirstError(formElement, validation);
      return;
    }
    const form = new FormData(formElement);
    const scheduled = String(form.get("scheduledAt"));
    setBusyAction("appointment");
    setFeedback(null);
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
      const body = (await response.json()) as ApiProblem;
      if (!response.ok) {
        const nextErrors = body.fieldErrors || {};
        setFieldErrors((current) => ({ ...current, ...nextErrors }));
        setFeedback({ text: body.error || "No se pudo guardar la cita", tone: "error" });
        focusFirstError(formElement, nextErrors);
      } else {
        formElement.reset();
        setFieldErrors({});
        setFeedback({ text: "Cita guardada", tone: "success" });
        startTransition(() => router.refresh());
      }
    } catch {
      setFeedback({ text: "Revise la fecha y la conexión", tone: "error" });
    } finally {
      setBusyAction(null);
    }
  }

  async function completeTimer(id: string) {
    setBusyAction(`complete:${id}`);
    try {
      const response = await fetch(`/api/timers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      const body = (await response.json()) as ApiProblem;
      if (!response.ok) {
        setFeedback({ text: body.error || "No se pudo completar el temporizador", tone: "error" });
        return;
      }
      setFeedback({ text: "Temporizador completado", tone: "success" });
      startTransition(() => router.refresh());
    } catch {
      setFeedback({ text: "Revise la conexión e inténtelo de nuevo", tone: "error" });
    } finally {
      setBusyAction(null);
    }
  }

  async function requestNotifications() {
    if (!("Notification" in window)) {
      setFeedback({ text: "Este navegador no admite notificaciones", tone: "error" });
      return;
    }
    const permission = await Notification.requestPermission();
    setFeedback(permission === "granted" ? { text: "Notificaciones activadas", tone: "success" } : { text: "Las notificaciones no están habilitadas", tone: "info" });
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
                <button type="button" disabled={busyAction === `complete:${timer.id}` || refreshing} onClick={() => completeTimer(timer.id)} aria-label="Marcar como hecho" className="flex size-11 shrink-0 items-center justify-center rounded-[0.95rem] bg-panel text-polar transition-transform active:scale-95 disabled:opacity-55">
                  <CheckIcon size={21} weight="bold" />
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-7 rounded-[1.5rem] border border-polar/10 bg-panel p-4 shadow-card sm:p-6">
        <h2 className="text-lg font-black text-polar-dark">Nuevo temporizador</h2>
        <form onSubmit={createTimer} noValidate className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(6.5rem,7rem)] gap-3 max-[350px]:grid-cols-1">
          <Field label="Recordatorio" htmlFor="timer-label" error={fieldErrors.label}>
            <Input id="timer-label" name="label" minLength={2} maxLength={120} required placeholder="Volver a medir" onChange={() => clearError("label")} aria-invalid={Boolean(fieldErrors.label)} />
          </Field>
          <Field label="En minutos" htmlFor="timer-minutes" error={fieldErrors.minutes}>
            <Input id="timer-minutes" name="minutes" type="number" inputMode="numeric" min="1" max="1440" defaultValue="15" required onChange={() => clearError("minutes")} aria-invalid={Boolean(fieldErrors.minutes)} />
          </Field>
          <Button type="submit" loading={busyAction === "timer" || refreshing} icon={<TimerIcon size={20} weight="bold" />} className="col-span-full min-h-14 max-[350px]:col-span-1">Iniciar</Button>
        </form>
      </section>

      <section className="mt-7 rounded-[1.5rem] border border-polar/10 bg-panel p-4 shadow-card sm:p-6">
        <h2 className="text-lg font-black text-polar-dark">Próximas citas</h2>
        {sortedAppointments.length ? (
          <div className="mt-3 divide-y divide-border">
            {sortedAppointments.map((item) => (
              <article key={item.id} className="min-w-0 py-4">
                <p className="truncate font-black">{item.title}</p>
                <p className="mt-1 text-sm font-extrabold text-polar">{formatPolarDateTime(item.scheduledAt, { dateStyle: "long", timeStyle: "short" })}</p>
                {item.notes ? <p className="mt-1 text-sm font-semibold leading-5 text-ink-soft">{item.notes}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-[1.15rem] bg-surface px-4 py-5 text-sm font-bold text-ink-soft">No hay citas próximas.</p>
        )}

        <form onSubmit={createAppointment} noValidate className="mt-6 flex min-w-0 flex-col gap-4">
          <Field label="Título" htmlFor="appointment-title" error={fieldErrors.title}>
            <Input id="appointment-title" name="title" minLength={2} maxLength={160} required placeholder="Control con el equipo" onChange={() => clearError("title")} aria-invalid={Boolean(fieldErrors.title)} />
          </Field>
          <Field label="Fecha y hora" htmlFor="appointment-date" error={fieldErrors.scheduledAt}>
            <Input id="appointment-date" name="scheduledAt" type="datetime-local" required onChange={() => clearError("scheduledAt")} aria-invalid={Boolean(fieldErrors.scheduledAt)} />
          </Field>
          <Field label="Nota opcional" htmlFor="appointment-notes">
            <Textarea id="appointment-notes" name="notes" maxLength={500} />
          </Field>
          <Button type="submit" loading={busyAction === "appointment" || refreshing} icon={<CalendarPlusIcon size={21} weight="bold" />} className="min-h-14">Guardar cita</Button>
        </form>
      </section>

      {feedback ? <Toast message={feedback.text} tone={feedback.tone} onDismiss={() => setFeedback(null)} /> : null}
    </div>
  );
}
