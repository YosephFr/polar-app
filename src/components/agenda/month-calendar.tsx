"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CaretLeftIcon, CaretRightIcon, CalendarDotsIcon, DropIcon } from "@phosphor-icons/react";
import type { CalendarPayload } from "@/lib/db/data";
import { formatPolarDateTime, polarDateKey } from "@/lib/date-time";

const weekdayLabels = ["L", "M", "X", "J", "V", "S", "D"];

function moveMonth(month: string, amount: number) {
  const [year, index] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, index - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function calendarCells(month: string) {
  const [year, index] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, index - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, index - 1, 1 - offset));
  return Array.from({ length: 42 }, (_, position) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + position);
    const key = date.toISOString().slice(0, 10);
    return { key, day: date.getUTCDate(), current: key.startsWith(month) };
  });
}

function monthLabel(month: string) {
  const [year, index] = month.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es-419", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, index - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function MonthCalendar({ patientId, initial, todayKey }: { patientId: string; initial: CalendarPayload; todayKey: string }) {
  const [payload, setPayload] = useState(initial);
  const [loading, setLoading] = useState(false);
  const today = todayKey;
  const [selected, setSelected] = useState(today.startsWith(initial.month) ? today : `${initial.month}-01`);

  const load = useCallback(async (month: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/calendar?patientId=${encodeURIComponent(patientId)}&month=${month}`, { cache: "no-store" });
      if (!response.ok) return;
      const next = await response.json() as CalendarPayload;
      setPayload(next);
      setSelected((current) => current.startsWith(month) ? current : `${month}-01`);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    const refresh = () => void load(payload.month);
    window.addEventListener("polar:calendar-refresh", refresh);
    return () => window.removeEventListener("polar:calendar-refresh", refresh);
  }, [load, payload.month]);

  const events = useMemo(() => {
    const byDay = new Map<string, { appointments: CalendarPayload["appointments"]; records: CalendarPayload["records"] }>();
    for (const appointment of payload.appointments) {
      const key = polarDateKey(appointment.scheduledAt);
      const current = byDay.get(key) || { appointments: [], records: [] };
      current.appointments.push(appointment);
      byDay.set(key, current);
    }
    for (const record of payload.records) {
      const key = polarDateKey(record.occurredAt);
      const current = byDay.get(key) || { appointments: [], records: [] };
      current.records.push(record);
      byDay.set(key, current);
    }
    return byDay;
  }, [payload]);

  const selectedEvents = events.get(selected) || { appointments: [], records: [] };

  return (
    <section className="mt-7 rounded-[1.5rem] border border-polar/10 bg-panel p-4 shadow-card sm:p-6" aria-busy={loading}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black text-polar-dark">Calendario</h2>
          <p className="mt-0.5 text-xs font-bold text-ink-soft">Registros y citas del mes</p>
        </div>
        <button type="button" disabled={loading} onClick={() => void load(moveMonth(payload.month, -1))} aria-label="Mes anterior" className="flex size-11 items-center justify-center rounded-[0.9rem] bg-surface text-ink active:scale-95 disabled:opacity-45"><CaretLeftIcon size={19} weight="bold" /></button>
        <button type="button" disabled={loading} onClick={() => void load(moveMonth(payload.month, 1))} aria-label="Mes siguiente" className="flex size-11 items-center justify-center rounded-[0.9rem] bg-surface text-ink active:scale-95 disabled:opacity-45"><CaretRightIcon size={19} weight="bold" /></button>
      </div>

      <p className="mt-4 text-center text-sm font-black text-ink">{monthLabel(payload.month)}</p>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {weekdayLabels.map((label) => <span key={label} className="py-1 text-[0.68rem] font-black text-ink-faint">{label}</span>)}
        {calendarCells(payload.month).map((cell) => {
          const dayEvents = events.get(cell.key);
          const active = selected === cell.key;
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => { if (cell.current) setSelected(cell.key); }}
              disabled={!cell.current}
              aria-label={`${cell.key}${dayEvents ? `, ${dayEvents.records.length} registros y ${dayEvents.appointments.length} citas` : ""}`}
              className={`relative flex aspect-square min-h-10 items-center justify-center rounded-[0.85rem] text-sm font-black transition-colors ${active ? "bg-polar text-white" : cell.current ? "text-ink hover:bg-surface" : "text-ink-faint/35"} ${cell.key === today && !active ? "ring-2 ring-inset ring-polar/30" : ""}`}
            >
              {cell.day}
              {dayEvents ? (
                <span className="absolute bottom-1 flex gap-0.5">
                  {dayEvents.records.length ? <span className={`size-1 rounded-full ${active ? "bg-white" : "bg-polar"}`} /> : null}
                  {dayEvents.appointments.length ? <span className={`size-1 rounded-full ${active ? "bg-white/70" : "bg-warning"}`} /> : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <p className="text-xs font-black text-ink-soft">{formatPolarDateTime(`${selected}T12:00:00.000Z`, { dateStyle: "full" })}</p>
        {selectedEvents.appointments.length === 0 && selectedEvents.records.length === 0 ? (
          <p className="mt-2 text-sm font-semibold text-ink-faint">No hay actividad registrada este día.</p>
        ) : (
          <div className="mt-2 divide-y divide-border">
            {selectedEvents.appointments.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2.5">
                <CalendarDotsIcon size={19} weight="duotone" className="shrink-0 text-warning" />
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{item.title}</span>
                <span className="shrink-0 text-xs font-bold text-ink-soft">{formatPolarDateTime(item.scheduledAt, { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
            {selectedEvents.records.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2.5">
                <DropIcon size={19} weight="fill" className={`shrink-0 ${item.status === "blocked_low" ? "text-danger" : "text-polar"}`} />
                <span className="tnum min-w-0 flex-1 text-sm font-black text-ink">{item.glucose} mg/dL</span>
                <span className="shrink-0 text-xs font-bold text-ink-soft">{formatPolarDateTime(item.occurredAt, { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
