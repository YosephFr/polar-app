"use client";

import { useMemo, useState } from "react";
import { DownloadSimpleIcon, FilePdfIcon, ShareNetworkIcon } from "@phosphor-icons/react";
import { formatPolarDateTime } from "@/lib/date-time";

type GlucosePoint = { id: string; glucose: number; occurredAt: string };

const ranges = [7, 10, 14, 30, 90] as const;

function percentage(value: number, total: number) {
  return total ? Math.round(value / total * 100) : 0;
}

export function GlucoseAnalytics({
  patientId,
  points,
  nowIso,
  lowBoundary,
}: {
  patientId: string;
  points: GlucosePoint[];
  nowIso: string;
  lowBoundary: number;
}) {
  const [days, setDays] = useState<(typeof ranges)[number]>(14);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const now = useMemo(() => new Date(nowIso).getTime(), [nowIso]);
  const filtered = useMemo(() => points
    .filter((point) => now - new Date(point.occurredAt).getTime() <= days * 86_400_000)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)), [days, now, points]);
  const selected = filtered.find((point) => point.id === selectedId) || filtered.at(-1) || null;
  const stats = useMemo(() => {
    const total = filtered.length;
    const low = filtered.filter((point) => point.glucose <= lowBoundary).length;
    const inRange = filtered.filter((point) => point.glucose > lowBoundary && point.glucose <= 180).length;
    const elevated = filtered.filter((point) => point.glucose > 180 && point.glucose <= 240).length;
    const high = filtered.filter((point) => point.glucose > 240).length;
    return {
      average: total ? Math.round(filtered.reduce((sum, point) => sum + point.glucose, 0) / total) : null,
      values: [percentage(low, total), percentage(inRange, total), percentage(elevated, total), percentage(high, total)],
    };
  }, [filtered, lowBoundary]);

  const chart = useMemo(() => {
    const width = 720;
    const height = 250;
    const left = 42;
    const right = 16;
    const top = 18;
    const bottom = 34;
    const values = filtered.map((point) => point.glucose);
    const minimum = Math.min(40, ...values) - 10;
    const maximum = Math.max(260, ...values) + 10;
    const x = (index: number) => filtered.length <= 1 ? (left + width - right) / 2 : left + index / (filtered.length - 1) * (width - left - right);
    const y = (value: number) => top + (maximum - value) / (maximum - minimum) * (height - top - bottom);
    return {
      width,
      height,
      minimum,
      maximum,
      y,
      coordinates: filtered.map((point, index) => ({ ...point, x: x(index), y: y(point.glucose) })),
    };
  }, [filtered]);

  async function sharePdf() {
    setFeedback("");
    try {
      const url = `/api/reports/pdf?patientId=${encodeURIComponent(patientId)}&days=${days}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const file = new File([blob], `polar-${days}-dias.pdf`, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Informe Polar" });
        setFeedback("Informe compartido.");
        return;
      }
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(href);
      setFeedback("Informe descargado.");
    } catch {
      setFeedback("No se pudo preparar el informe.");
    }
  }

  const categoryLabels = [`≤ ${lowBoundary}`, `${lowBoundary + 1}–180`, "181–240", "> 240"];
  const categoryColors = ["bg-danger", "bg-success", "bg-warning", "bg-ink-soft"];

  return (
    <section className="mt-7 rounded-[1.75rem] border border-polar/10 bg-panel p-4 shadow-card sm:p-6">
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black tracking-[-0.025em] text-polar-dark">Glucosa</h2>
          <p className="mt-1 text-sm font-semibold text-ink-soft">{filtered.length} registros · promedio {stats.average ?? "—"} mg/dL</p>
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Periodo del análisis">
          {ranges.map((range) => (
            <button key={range} type="button" onClick={() => { setDays(range); setSelectedId(null); }} aria-pressed={days === range} className={`min-h-10 min-w-10 rounded-[0.8rem] px-2 text-xs font-black transition-colors ${days === range ? "bg-polar text-white" : "bg-surface text-ink-soft"}`}>{range} d</button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <>
          <div className="mt-5 min-w-0 overflow-hidden rounded-[1.25rem] bg-surface px-2 py-3">
            <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="block h-auto w-full" role="img" aria-label={`Evolución de glucosa durante ${days} días`}>
              {[lowBoundary, 180, 240].map((value) => (
                <g key={value}>
                  <line x1="42" x2={chart.width - 16} y1={chart.y(value)} y2={chart.y(value)} stroke="currentColor" strokeOpacity="0.12" strokeDasharray="5 6" />
                  <text x="36" y={chart.y(value) + 4} textAnchor="end" className="fill-ink-faint text-[10px] font-bold">{value}</text>
                </g>
              ))}
              <polyline points={chart.coordinates.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="var(--color-polar)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              {chart.coordinates.map((point) => {
                const active = point.id === selected?.id;
                const color = point.glucose <= lowBoundary ? "var(--color-danger)" : point.glucose > 180 ? "var(--color-warning)" : "var(--color-polar)";
                return (
                  <circle key={point.id} cx={point.x} cy={point.y} r={active ? 8 : 6} fill={color} stroke="var(--color-panel)" strokeWidth="3" role="button" tabIndex={0} aria-label={`${point.glucose} mg/dL, ${formatPolarDateTime(point.occurredAt, { dateStyle: "medium", timeStyle: "short" })}`} onClick={() => setSelectedId(point.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedId(point.id); }} />
                );
              })}
              {chart.coordinates[0] ? <text x="42" y={chart.height - 8} className="fill-ink-faint text-[10px] font-bold">{formatPolarDateTime(chart.coordinates[0].occurredAt, { day: "numeric", month: "short" })}</text> : null}
              {chart.coordinates.at(-1) ? <text x={chart.width - 16} y={chart.height - 8} textAnchor="end" className="fill-ink-faint text-[10px] font-bold">{formatPolarDateTime(chart.coordinates.at(-1)!.occurredAt, { day: "numeric", month: "short" })}</text> : null}
            </svg>
          </div>
          {selected ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-[1rem] bg-polar-soft px-4 py-3 text-sm">
              <span className="font-black text-polar-dark">{selected.glucose} mg/dL</span>
              <span className="text-right text-xs font-bold text-ink-soft">{formatPolarDateTime(selected.occurredAt, { dateStyle: "medium", timeStyle: "short" })}</span>
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-5 rounded-[1.15rem] bg-surface px-4 py-7 text-center text-sm font-bold text-ink-soft">No hay registros en este periodo.</p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
        {categoryLabels.map((label, index) => (
          <div key={label} className="min-w-0">
            <div className="flex items-center justify-between gap-3 text-xs font-black text-ink-soft"><span>{label} mg/dL</span><span>{stats.values[index]}%</span></div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-strong"><span className={`block h-full rounded-full transition-[width] duration-500 ${categoryColors[index]}`} style={{ width: `${stats.values[index]}%` }} /></div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
        <a href={`/api/reports/pdf?patientId=${encodeURIComponent(patientId)}&days=${days}`} download className="inline-flex min-h-11 items-center gap-2 rounded-[0.9rem] bg-polar px-3.5 text-xs font-black text-white"><FilePdfIcon size={18} weight="bold" />PDF</a>
        <a href={`/api/reports/csv?patientId=${encodeURIComponent(patientId)}&days=${days}`} download className="inline-flex min-h-11 items-center gap-2 rounded-[0.9rem] bg-surface px-3.5 text-xs font-black text-polar-dark"><DownloadSimpleIcon size={18} weight="bold" />CSV</a>
        <button type="button" onClick={() => void sharePdf()} className="inline-flex min-h-11 items-center gap-2 rounded-[0.9rem] bg-surface px-3.5 text-xs font-black text-polar-dark"><ShareNetworkIcon size={18} weight="bold" />Compartir</button>
      </div>
      {feedback ? <p className="mt-3 text-xs font-bold text-polar-dark" role="status">{feedback}</p> : null}
    </section>
  );
}
