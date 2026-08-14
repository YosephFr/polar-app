"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlusIcon, TimerIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Toast } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { clearFieldError, focusFirstError, validateForm, type ApiProblem, type FieldErrors } from "@/lib/client/form-validation";
import { formatPolarDateTime } from "@/lib/date-time";
import type { Appointment, CalendarPayload } from "@/lib/db/data";
import { usePolar } from "@/components/app/app-context";
import { useNotificationCenter } from "@/components/notifications/notification-center-provider";
import { MonthCalendar } from "./month-calendar";
import { TimerList } from "./timer-list";

export function AgendaClient({
  appointments,
  calendar,
  todayKey,
}: {
  appointments: Appointment[];
  calendar: CalendarPayload;
  todayKey: string;
}) {
  const { patient } = usePolar();
  const { refresh } = useNotificationCenter();
  const router = useRouter();
  const [timerMinutes, setTimerMinutes] = useState("15");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [refreshing, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ text: string; tone: "success" | "error" | "info" } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [hiddenAppointments, setHiddenAppointments] = useState<string[]>([]);
  const [undoAppointment, setUndoAppointment] = useState<Appointment | null>(null);

  const visibleAppointments = useMemo(
    () => appointments.filter((item) => !hiddenAppointments.includes(item.id)),
    [appointments, hiddenAppointments],
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
          dueAt: new Date(Date.now() + minutes * 60_000).toISOString(),
          kind: "manual",
        }),
      });
      const body = await response.json() as ApiProblem;
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
        setTimerMinutes("15");
        setFieldErrors({});
        setFeedback({ text: "Temporizador iniciado", tone: "success" });
        await refresh();
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
    setBusyAction("appointment");
    setFeedback(null);
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          title: String(form.get("title")),
          scheduledAt: new Date(String(form.get("scheduledAt"))).toISOString(),
          notes: String(form.get("notes") || "").trim() || null,
          reminderMinutes: Number(form.get("reminderMinutes")),
        }),
      });
      const body = await response.json() as ApiProblem;
      if (!response.ok) {
        const nextErrors = body.fieldErrors || {};
        setFieldErrors((current) => ({ ...current, ...nextErrors }));
        setFeedback({ text: body.error || "No se pudo guardar la cita", tone: "error" });
        focusFirstError(formElement, nextErrors);
      } else {
        formElement.reset();
        setFieldErrors({});
        setFeedback({ text: "Cita guardada", tone: "success" });
        window.dispatchEvent(new Event("polar:calendar-refresh"));
        await refresh();
        startTransition(() => router.refresh());
      }
    } catch {
      setFeedback({ text: "Revise la fecha y la conexión", tone: "error" });
    } finally {
      setBusyAction(null);
    }
  }

  async function removeAppointment(appointment: Appointment) {
    setBusyAction(`delete:${appointment.id}`);
    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as ApiProblem;
        setFeedback({ text: body.error || "No se pudo eliminar la cita", tone: "error" });
        return;
      }
      setHiddenAppointments((current) => [...current, appointment.id]);
      setUndoAppointment(appointment);
      window.dispatchEvent(new Event("polar:calendar-refresh"));
      await refresh();
    } finally {
      setBusyAction(null);
    }
  }

  async function restoreAppointment() {
    if (!undoAppointment) return;
    const appointment = undoAppointment;
    setBusyAction(`restore:${appointment.id}`);
    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      if (!response.ok) {
        setFeedback({ text: "No se pudo recuperar la cita", tone: "error" });
        return;
      }
      setHiddenAppointments((current) => current.filter((id) => id !== appointment.id));
      setUndoAppointment(null);
      window.dispatchEvent(new Event("polar:calendar-refresh"));
      await refresh();
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="min-w-0">
      <PageHeader title="Agenda" subtitle={patient.name} />

      <TimerList onFeedback={(text, tone) => setFeedback({ text, tone })} />

      <section className="mt-7 rounded-[1.5rem] border border-polar/10 bg-panel p-4 shadow-card sm:p-6">
        <h2 className="text-lg font-black text-polar-dark">Nuevo temporizador</h2>
        <div className="mt-3 flex gap-2" aria-label="Duraciones frecuentes">
          {[15, 120].map((minutes) => (
            <button key={minutes} type="button" onClick={() => setTimerMinutes(String(minutes))} className={`min-h-10 rounded-[0.8rem] px-3 text-xs font-black transition-colors ${timerMinutes === String(minutes) ? "bg-polar text-white" : "bg-surface text-polar-dark"}`}>
              {minutes === 120 ? "2 horas" : `${minutes} min`}
            </button>
          ))}
        </div>
        <form onSubmit={createTimer} noValidate className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(6.5rem,7rem)] gap-3 max-[350px]:grid-cols-1">
          <Field label="Recordatorio" htmlFor="timer-label" error={fieldErrors.label}>
            <Input id="timer-label" name="label" minLength={2} maxLength={120} required placeholder="Volver a medir" onChange={() => clearError("label")} aria-invalid={Boolean(fieldErrors.label)} />
          </Field>
          <Field label="En minutos" htmlFor="timer-minutes" error={fieldErrors.minutes}>
            <Input id="timer-minutes" name="minutes" type="number" inputMode="numeric" min="1" max="1440" value={timerMinutes} required onChange={(event) => { setTimerMinutes(event.target.value); clearError("minutes"); }} aria-invalid={Boolean(fieldErrors.minutes)} />
          </Field>
          <Button type="submit" loading={busyAction === "timer"} icon={<TimerIcon size={20} weight="bold" />} className="col-span-full min-h-14 max-[350px]:col-span-1">Iniciar</Button>
        </form>
      </section>

      <MonthCalendar patientId={patient.id} initial={calendar} todayKey={todayKey} />

      <section className="mt-7 rounded-[1.5rem] border border-polar/10 bg-panel p-4 shadow-card sm:p-6">
        <h2 className="text-lg font-black text-polar-dark">Próximas citas</h2>
        {visibleAppointments.length ? (
          <div className="mt-3 divide-y divide-border">
            {visibleAppointments.map((item) => (
              <article key={item.id} className="flex min-w-0 items-start gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black">{item.title}</p>
                  <p className="mt-1 text-sm font-extrabold text-polar">{formatPolarDateTime(item.scheduledAt, { dateStyle: "long", timeStyle: "short" })}</p>
                  {item.notes ? <p className="mt-1 text-sm font-semibold leading-5 text-ink-soft">{item.notes}</p> : null}
                </div>
                <button type="button" disabled={busyAction === `delete:${item.id}`} onClick={() => void removeAppointment(item)} aria-label={`Eliminar ${item.title}`} className="flex size-11 shrink-0 items-center justify-center rounded-[0.9rem] text-danger hover:bg-danger-soft disabled:opacity-45">
                  <TrashIcon size={20} weight="bold" />
                </button>
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
          <div className="grid min-w-0 grid-cols-1 gap-4 min-[500px]:grid-cols-2">
            <Field label="Fecha y hora" htmlFor="appointment-date" error={fieldErrors.scheduledAt}>
              <Input id="appointment-date" name="scheduledAt" type="datetime-local" required onChange={() => clearError("scheduledAt")} aria-invalid={Boolean(fieldErrors.scheduledAt)} />
            </Field>
            <Field label="Avisar antes" htmlFor="appointment-reminder">
              <Select id="appointment-reminder" name="reminderMinutes" defaultValue="1440">
                <option value="60">1 hora</option>
                <option value="180">3 horas</option>
                <option value="1440">1 día</option>
                <option value="2880">2 días</option>
              </Select>
            </Field>
          </div>
          <Field label="Nota opcional" htmlFor="appointment-notes">
            <Textarea id="appointment-notes" name="notes" maxLength={500} />
          </Field>
          <Button type="submit" loading={busyAction === "appointment" || refreshing} icon={<CalendarPlusIcon size={21} weight="bold" />} className="min-h-14">Guardar cita</Button>
        </form>
      </section>

      {feedback ? <Toast message={feedback.text} tone={feedback.tone} onDismiss={() => setFeedback(null)} /> : null}
      {undoAppointment ? (
        <div className="page-enter fixed inset-x-4 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] z-[66] mx-auto flex max-w-md items-center gap-3 rounded-[1.35rem] bg-ink px-4 py-3.5 text-white shadow-float" role="status">
          <span className="min-w-0 flex-1 text-sm font-extrabold">Cita eliminada</span>
          <button type="button" disabled={busyAction === `restore:${undoAppointment.id}`} onClick={() => void restoreAppointment()} className="min-h-10 px-2 text-sm font-black text-white">Deshacer</button>
          <button type="button" onClick={() => setUndoAppointment(null)} aria-label="Cerrar" className="flex size-9 items-center justify-center rounded-[0.75rem] text-white/70"><XIcon size={18} weight="bold" /></button>
        </div>
      ) : null}
    </div>
  );
}
