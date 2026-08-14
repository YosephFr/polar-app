"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, ChevronDown, CircleSlashed, Goal, SlidersHorizontal, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { calculateDose, mealLabels, mealTypes, type DoseResult } from "@/lib/domain/calculator";
import type { BolusRecord, PatientCarePlan } from "@/lib/db/data";
import { usePolar } from "@/components/app/app-context";

function formatDose(value: number | null) {
  if (value === null) return "—";
  return `${value.toLocaleString("es-419", { maximumFractionDigits: 2 })} U`;
}

function RecentRecord({ record }: { record: BolusRecord | null }) {
  if (!record) {
    return <div className="rounded-lg bg-surface px-5 py-6 text-sm font-semibold text-ink-soft">No hay registros para este perfil.</div>;
  }
  return (
    <article className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-lg bg-surface px-4 py-4 sm:px-5">
      <span className="flex size-11 items-center justify-center rounded-full bg-polar text-white"><Utensils size={21} /></span>
      <div className="min-w-0">
        <p className="truncate font-extrabold text-ink">{mealLabels[record.mealType]}</p>
        <p className="mt-0.5 truncate text-xs font-semibold text-ink-soft">{record.actorName} · {new Date(record.occurredAt).toLocaleString("es-419", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
      </div>
      <div className="text-right">
        <p className="tnum text-sm font-extrabold">{record.glucose} <span className="font-semibold text-ink-soft">mg/dL</span></p>
        <p className="tnum mt-0.5 text-sm font-extrabold text-polar">{formatDose(record.administeredDose ?? record.recommendedDose)}</p>
      </div>
    </article>
  );
}

export function DoseCalculator({ carePlan, latestRecord }: { carePlan: PatientCarePlan; latestRecord: BolusRecord | null }) {
  const { patient } = usePolar();
  const router = useRouter();
  const [mealType, setMealType] = useState<(typeof mealTypes)[number]>("breakfast");
  const [glucose, setGlucose] = useState("");
  const [carbs, setCarbs] = useState("");
  const [activeInsulin, setActiveInsulin] = useState("0");
  const [activityAdjustmentPercent, setActivityAdjustmentPercent] = useState("0");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<DoseResult | null>(null);
  const [administeredDose, setAdministeredDose] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const target = mealType === "correction" ? carePlan.correctionTarget : carePlan.premealTarget;
  const input = useMemo(() => ({
    mealType,
    glucose: Number(glucose),
    carbs: Number(carbs || 0),
    activeInsulin: Number(activeInsulin || 0),
    activityAdjustmentPercent: Number(activityAdjustmentPercent || 0),
  }), [mealType, glucose, carbs, activeInsulin, activityAdjustmentPercent]);

  function calculate() {
    setMessage("");
    try {
      const nextResult = calculateDose(carePlan, input);
      setResult(nextResult);
      setAdministeredDose(nextResult.recommendedDose === null ? "" : String(nextResult.recommendedDose));
    } catch {
      setResult(null);
      setMessage("Revise los valores ingresados");
    }
  }

  async function save() {
    if (!result || saving) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          ...input,
          administeredDose: result.status === "blocked_low" ? null : administeredDose === "" ? null : Number(administeredDose),
          notes: notes.trim() || null,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(body.error || "No se pudo guardar el registro");
        return;
      }
      setMessage(result.status === "blocked_low" ? "Glucosa baja registrada" : "Registro guardado");
      setResult(null);
      setGlucose("");
      setCarbs("");
      setNotes("");
      router.refresh();
    } catch {
      setMessage("Revise la conexión e inténtelo de nuevo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form onSubmit={(event) => { event.preventDefault(); calculate(); }}>
        <Field label="Comida" htmlFor="meal-type">
          <div className="relative">
            <Utensils size={23} className="pointer-events-none absolute left-5 top-1/2 z-10 -translate-y-1/2 text-polar" />
            <Select id="meal-type" value={mealType} onValueChange={(value) => { setMealType(value as typeof mealType); setResult(null); }} className="h-[4.25rem] rounded-lg border-border-strong pl-14 text-lg font-extrabold">
              {mealTypes.map((type) => <option key={type} value={type}>{mealLabels[type]}</option>)}
            </Select>
          </div>
        </Field>

        <div className="mt-7 grid grid-cols-2 gap-4">
          <Field label="Glucosa" htmlFor="glucose">
            <div className="relative"><Input id="glucose" type="number" inputMode="numeric" min="20" max="600" required placeholder="110" value={glucose} onChange={(event) => { setGlucose(event.target.value); setResult(null); }} className="h-[4.75rem] rounded-lg border-2 border-polar pr-20 text-[2rem] font-extrabold tnum placeholder:text-ink-faint" /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-soft">mg/dL</span></div>
          </Field>
          <Field label="Carbohidratos" htmlFor="carbs">
            <div className="relative"><Input id="carbs" type="number" inputMode="decimal" min="0" max="300" step="0.1" required={mealType !== "correction"} disabled={mealType === "correction"} placeholder="30" value={carbs} onChange={(event) => { setCarbs(event.target.value); setResult(null); }} className="h-[4.75rem] rounded-lg border-2 border-polar pr-10 text-[2rem] font-extrabold tnum placeholder:text-ink-faint" /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-soft">g</span></div>
          </Field>
        </div>

        <div className="mt-5 flex items-center gap-4 rounded-lg bg-surface px-5 py-4 text-sm font-bold text-ink">
          <Goal size={23} className="shrink-0 text-polar" />
          <span>Objetivo: {target} mg/dL</span>
        </div>

        <details className="group mt-4 rounded-lg bg-surface">
          <summary className="flex min-h-16 cursor-pointer list-none items-center gap-4 px-5 font-bold text-ink [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal size={22} className="text-polar" />
            <span>Ajustes opcionales</span>
            <ChevronDown size={20} className="ml-auto transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid grid-cols-2 gap-4 border-t border-border px-5 pb-5 pt-4">
            <Field label="Insulina activa" htmlFor="active-insulin"><Input id="active-insulin" type="number" inputMode="decimal" min="0" max="100" step="0.1" value={activeInsulin} onChange={(event) => { setActiveInsulin(event.target.value); setResult(null); }} /></Field>
            <Field label="Reducir por actividad" htmlFor="activity"><Input id="activity" type="number" inputMode="numeric" min="0" max="100" value={activityAdjustmentPercent} onChange={(event) => { setActivityAdjustmentPercent(event.target.value); setResult(null); }} /></Field>
            <Field label="Nota" htmlFor="record-notes" className="col-span-2"><Textarea id="record-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcional" /></Field>
          </div>
        </details>

        <Button type="button" onClick={calculate} icon={<Calculator size={23} />} className="mt-5 h-[3.75rem] w-full rounded-lg text-lg">Calcular dosis</Button>
      </form>

      {result ? (
        <section className={`mt-5 rounded-lg border p-5 ${result.status === "blocked_low" ? "border-danger/25 bg-danger-soft" : "border-polar/20 bg-polar-soft"}`} aria-live="polite">
          {result.status === "blocked_low" ? (
            <>
              <div className="flex items-start gap-3"><CircleSlashed size={25} className="mt-0.5 shrink-0 text-danger" /><div><h2 className="font-extrabold text-danger">No calcular insulina ahora</h2><p className="mt-1 text-sm leading-5 text-ink">La glucosa está por debajo del umbral de {carePlan.lowThreshold} mg/dL.</p></div></div>
              {carePlan.hypoTreatmentNote ? <p className="mt-4 rounded-md bg-white/70 px-4 py-3 text-sm font-semibold leading-5 text-ink">{carePlan.hypoTreatmentNote}</p> : null}
              <Button type="button" variant="secondary" loading={saving} onClick={save} className="mt-4 w-full">Registrar glucosa baja</Button>
            </>
          ) : (
            <>
              <div className="flex items-end justify-between gap-3"><div><p className="text-sm font-bold text-polar-dark">Dosis calculada</p><p className="tnum mt-1 text-4xl font-extrabold tracking-[-0.04em]">{formatDose(result.recommendedDose)}</p></div>{result.limitedByMaximum ? <span className="text-right text-xs font-bold text-warning">Limitada al máximo del plan</span> : null}</div>
              <Field label="Dosis realmente administrada" htmlFor="administered-dose" className="mt-5"><Input id="administered-dose" type="number" inputMode="decimal" min="0" max="200" step={carePlan.roundingIncrement} value={administeredDose} onChange={(event) => setAdministeredDose(event.target.value)} /></Field>
              <p className="mt-3 text-xs font-semibold leading-5 text-ink-soft">Confirme la dosis administrada antes de guardar.</p>
              <Button type="button" loading={saving} onClick={save} className="mt-4 w-full">Guardar registro</Button>
            </>
          )}
        </section>
      ) : null}
      {message ? <p className="mt-4 rounded-md bg-surface px-4 py-3 text-sm font-bold text-ink" role="status">{message}</p> : null}

      <section className="mt-10 border-t border-border pt-7">
        <h2 className="mb-4 text-lg font-extrabold text-polar-dark">Último registro</h2>
        <RecentRecord record={latestRecord} />
      </section>
    </>
  );
}
