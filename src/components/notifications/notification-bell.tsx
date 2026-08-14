"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowClockwiseIcon,
  BellIcon,
  BellRingingIcon,
  CalendarBlankIcon,
  CheckIcon,
  CircleNotchIcon,
  CloudSlashIcon,
  GearSixIcon,
  PulseIcon,
  PhoneCallIcon,
  TimerIcon,
  XIcon,
} from "@phosphor-icons/react";
import { formatPolarDateTime } from "@/lib/date-time";
import { useNotificationCenter } from "./notification-center-provider";
import { usePolar } from "@/components/app/app-context";

function timerLabel(dueAt: string, status: string, remainingSeconds: number | null, now: number) {
  if (status === "paused") {
    const seconds = remainingSeconds || 0;
    return `En pausa · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }
  const seconds = Math.max(0, Math.ceil((new Date(dueAt).getTime() - now) / 1000));
  if (seconds === 0 || status === "due") return "Necesita atención";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}` : `${minutes}:${String(rest).padStart(2, "0")}`;
}

const pushLabels = {
  unsupported: "Este navegador no admite notificaciones push.",
  unconfigured: "Las notificaciones push no están configuradas en este entorno.",
  blocked: "El navegador bloqueó las notificaciones.",
  available: "Active los avisos en este dispositivo.",
  active: "Los avisos están activos en este dispositivo.",
};

export function NotificationBell() {
  const { patient } = usePolar();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const {
    snapshot,
    now,
    unreadCount,
    online,
    pendingSync,
    pushCapability,
    pushFeedback,
    pushBusy,
    updateReady,
    markRead,
    savePreferences,
    activatePush,
    deactivatePush,
    testPush,
    applyUpdate,
    dismissUpdate,
  } = useNotificationCenter();

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  const activeSources = new Set(snapshot.timers.map((timer) => `timer:${timer.id}`));
  const notifications = snapshot.notifications.filter(
    (item) => !(item.sourceType === "timer" && activeSources.has(`timer:${item.sourceId}`)),
  );
  const urgentTimer = snapshot.timers.some((timer) => timer.status === "due" || (timer.status === "active" && new Date(timer.dueAt).getTime() <= now));

  function changePreference(name: keyof typeof snapshot.preferences, checked: boolean) {
    void savePreferences({ ...snapshot.preferences, [name]: checked });
  }

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={unreadCount ? `Notificaciones, ${unreadCount} sin revisar` : "Notificaciones"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className={`relative flex size-11 items-center justify-center rounded-full border transition-[transform,background-color,border-color] duration-200 active:scale-95 ${urgentTimer ? "border-danger/25 bg-danger-soft text-danger" : "border-polar/15 bg-polar-soft text-polar"}`}
      >
        {urgentTimer ? <BellRingingIcon size={24} weight="fill" /> : <BellIcon size={24} weight="bold" />}
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-panel bg-danger px-1 text-[0.65rem] font-black leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <section
          role="dialog"
          aria-label="Centro de notificaciones"
          className="page-enter fixed inset-x-3 top-[calc(5rem+env(safe-area-inset-top))] z-[80] mx-auto flex max-h-[min(72dvh,42rem)] max-w-[28rem] flex-col overflow-hidden rounded-[1.5rem] border border-border bg-panel shadow-overlay min-[700px]:absolute min-[700px]:inset-x-auto min-[700px]:right-0 min-[700px]:top-[calc(100%+0.65rem)] min-[700px]:w-[26rem]"
        >
          <header className="flex min-h-16 items-center gap-3 border-b border-border px-4">
            <div className="min-w-0 flex-1">
              <h2 className="font-black text-ink">Notificaciones</h2>
              <p className="text-xs font-bold text-ink-soft">{unreadCount ? `${unreadCount} por revisar` : "Todo al día"}</p>
            </div>
            {snapshot.notifications.some((item) => !item.readAt) ? (
              <button type="button" onClick={() => void markRead()} className="min-h-10 px-2 text-xs font-black text-polar">Marcar leídas</button>
            ) : null}
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar notificaciones" className="flex size-10 items-center justify-center rounded-[0.8rem] text-ink-soft hover:bg-surface">
              <XIcon size={19} weight="bold" />
            </button>
          </header>

          <div className="min-w-0 flex-1 overflow-y-auto overscroll-contain">
            {!online || pendingSync ? (
              <div className="flex items-start gap-3 border-b border-border bg-warning-soft px-4 py-3.5 text-warning">
                <CloudSlashIcon size={22} weight="fill" className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-black">{online ? "Sincronización pendiente" : "Sin conexión"}</p>
                  <p className="mt-0.5 text-xs font-bold leading-4">{pendingSync ? `${pendingSync} registro${pendingSync === 1 ? "" : "s"} se enviará${pendingSync === 1 ? "" : "n"} al recuperar la conexión.` : "Polar volverá a sincronizar cuando haya conexión."}</p>
                </div>
              </div>
            ) : null}

            {updateReady && snapshot.preferences.updatesEnabled ? (
              <div className="flex items-start gap-3 border-b border-border bg-polar-soft px-4 py-4">
                <ArrowClockwiseIcon size={23} weight="bold" className="mt-0.5 shrink-0 text-polar" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-ink">Actualización disponible</p>
                  <p className="mt-0.5 text-xs font-bold text-ink-soft">Instale la nueva versión de Polar.</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={applyUpdate} className="min-h-10 rounded-[0.8rem] bg-polar px-3 text-xs font-black text-white">Actualizar</button>
                    <button type="button" onClick={dismissUpdate} className="min-h-10 px-2 text-xs font-black text-ink-soft">Más tarde</button>
                  </div>
                </div>
              </div>
            ) : null}

            {snapshot.timers.length ? (
              <div className="border-b border-border">
                <p className="px-4 pb-1 pt-4 text-xs font-black uppercase tracking-[0.08em] text-ink-faint">Temporizadores</p>
                {snapshot.timers.map((timer) => (
                  <Link key={timer.id} href="/agenda" onClick={() => setOpen(false)} className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface ${timer.status === "due" || (timer.status === "active" && new Date(timer.dueAt).getTime() <= now) ? "text-danger" : "text-ink"}`}>
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-[0.85rem] ${timer.status === "due" || (timer.status === "active" && new Date(timer.dueAt).getTime() <= now) ? "bg-danger-soft" : "bg-polar-soft text-polar"}`}>
                      <TimerIcon size={20} weight="fill" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black">{timer.label}</span>
                      <span className="tnum mt-0.5 block text-xs font-extrabold">{timerLabel(timer.dueAt, timer.status === "active" && new Date(timer.dueAt).getTime() <= now ? "due" : timer.status, timer.remainingSeconds, now)}</span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}

            {snapshot.latestRecord ? (
              <Link href="/historial" onClick={() => setOpen(false)} className="flex items-center gap-3 border-b border-border px-4 py-3.5 transition-colors hover:bg-surface">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[0.85rem] bg-surface text-polar"><PulseIcon size={21} weight="duotone" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-extrabold text-ink-soft">Último registro</span>
                  <span className="tnum block text-sm font-black text-ink">{snapshot.latestRecord.glucose} mg/dL</span>
                </span>
                <span className="shrink-0 text-right text-[0.68rem] font-bold text-ink-faint">{formatPolarDateTime(snapshot.latestRecord.occurredAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </Link>
            ) : null}

            {snapshot.appointments[0] ? (
              <Link href="/agenda" onClick={() => setOpen(false)} className="flex items-center gap-3 border-b border-border px-4 py-3.5 transition-colors hover:bg-surface">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[0.85rem] bg-surface text-polar"><CalendarBlankIcon size={21} weight="duotone" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-extrabold text-ink-soft">Próxima cita</span>
                  <span className="block truncate text-sm font-black text-ink">{snapshot.appointments[0].title}</span>
                </span>
                <span className="shrink-0 text-right text-[0.68rem] font-bold text-ink-faint">{formatPolarDateTime(snapshot.appointments[0].scheduledAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </Link>
            ) : null}

            {notifications.length ? (
              <div className="border-b border-border">
                <p className="px-4 pb-1 pt-4 text-xs font-black uppercase tracking-[0.08em] text-ink-faint">Actividad</p>
                {notifications.map((item) => (
                  <Link key={item.id} href={item.href} onClick={() => { setOpen(false); void markRead([item.id]); }} className={`flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface ${item.readAt ? "opacity-65" : ""}`}>
                    <span className={`mt-1 size-2 shrink-0 rounded-full ${item.readAt ? "bg-border-strong" : "bg-polar"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-ink">{item.title}</span>
                      <span className="mt-0.5 block text-xs font-semibold leading-4 text-ink-soft">{item.body}</span>
                    </span>
                    {!item.readAt ? <CheckIcon size={16} weight="bold" className="mt-1 shrink-0 text-polar" /> : null}
                  </Link>
                ))}
              </div>
            ) : null}

            {(patient.emergencyContactPhone || patient.emergencyServicePhone) ? (
              <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3.5">
                <span className="flex w-full items-center gap-2 text-xs font-black text-ink-soft"><PhoneCallIcon size={18} weight="duotone" className="text-polar" />Contactos rápidos</span>
                {patient.emergencyContactPhone ? <a href={`tel:${patient.emergencyContactPhone.replace(/[^+\d]/g, "")}`} className="inline-flex min-h-10 items-center rounded-[0.8rem] bg-polar px-3 text-xs font-black text-white">{patient.emergencyContactName || "Contacto"}</a> : null}
                {patient.emergencyServicePhone ? <a href={`tel:${patient.emergencyServicePhone.replace(/[^+\d]/g, "")}`} className="inline-flex min-h-10 items-center rounded-[0.8rem] bg-danger px-3 text-xs font-black text-white">Emergencias</a> : null}
              </div>
            ) : null}

            <details className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 font-black text-ink [&::-webkit-details-marker]:hidden">
                <GearSixIcon size={21} weight="duotone" className="text-polar" />
                <span className="min-w-0 flex-1">Configuración de avisos</span>
              </summary>
              <div className="border-t border-border px-4 pb-4 pt-3">
                <p className="text-xs font-bold leading-4 text-ink-soft">{pushLabels[pushCapability]}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {pushCapability === "available" ? <button type="button" disabled={pushBusy} aria-busy={pushBusy || undefined} onClick={() => void activatePush()} className="inline-flex min-h-10 items-center gap-2 rounded-[0.8rem] bg-polar px-3 text-xs font-black text-white disabled:opacity-65">{pushBusy ? <CircleNotchIcon size={16} weight="bold" className="animate-spin" /> : null}{pushBusy ? "Activando" : "Activar dispositivo"}</button> : null}
                  {pushCapability === "active" ? (
                    <>
                      <button type="button" disabled={pushBusy} aria-busy={pushBusy || undefined} onClick={() => void testPush()} className="inline-flex min-h-10 items-center gap-2 rounded-[0.8rem] bg-polar px-3 text-xs font-black text-white disabled:opacity-65">{pushBusy ? <CircleNotchIcon size={16} weight="bold" className="animate-spin" /> : null}{pushBusy ? "Enviando" : "Probar aviso"}</button>
                      <button type="button" disabled={pushBusy} onClick={() => void deactivatePush()} className="min-h-10 px-2 text-xs font-black text-ink-soft disabled:opacity-50">Desactivar</button>
                    </>
                  ) : null}
                </div>
                {pushFeedback ? <p className="mt-2 text-xs font-bold leading-4 text-polar-dark" role="status">{pushFeedback}</p> : null}
                <div className="mt-4 divide-y divide-border">
                  {([
                    ["timersEnabled", "Temporizadores"],
                    ["appointmentsEnabled", "Citas"],
                    ["glucoseAlertsEnabled", "Alertas de glucosa"],
                    ["updatesEnabled", "Actualizaciones"],
                  ] as const).map(([name, label]) => (
                    <label key={name} className="flex min-h-11 items-center gap-3 text-sm font-bold text-ink">
                      <input type="checkbox" checked={snapshot.preferences[name]} onChange={(event) => changePreference(name, event.target.checked)} className="size-5 accent-polar" />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </details>
          </div>
        </section>
      ) : null}
    </div>
  );
}
