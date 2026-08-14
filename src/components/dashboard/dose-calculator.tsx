"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  BowlFoodIcon,
  CalculatorIcon,
  CaretDownIcon,
  ProhibitIcon,
  SlidersHorizontalIcon,
  TargetIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/feedback";
import { SectionHeading } from "@/components/ui/section-heading";
import { clearFieldError, focusFirstError, validateForm, type ApiProblem, type FieldErrors } from "@/lib/client/form-validation";
import { formatPolarDateTime } from "@/lib/date-time";
import { calculateDose, mealLabels, mealTypes, type DoseResult } from "@/lib/domain/calculator";
import type { BolusRecord, PatientCarePlan } from "@/lib/db/data";
import { usePolar } from "@/components/app/app-context";

function formatDose(value: number | null) {
  if (value === null) return "—";
  return `${value.toLocaleString("es-419", { maximumFractionDigits: 2 })} U`;
}

function RecentRecord({ record }: { record: BolusRecord | null }) {
  if (!record) {
    return <div className="rounded-[1.5rem] border border-border bg-panel px-5 py-7 text-sm font-bold text-ink-soft shadow-card">No hay registros para este perfil.</div>;
  }
  return (
    <article className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[1.5rem] border border-polar/10 bg-panel px-4 py-4 shadow-card sm:gap-4 sm:px-5">
      <span className="flex size-12 items-center justify-center rounded-[1rem] bg-polar text-on-accent"><BowlFoodIcon size={23} weight="fill" /></span>
      <div className="min-w-0">
        <p className="truncate font-extrabold text-ink">{mealLabels[record.mealType]}</p>
        <p className="mt-0.5 truncate text-xs font-semibold text-ink-soft">{record.actorName} · {formatPolarDateTime(record.occurredAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
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
  const [refreshing, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const target = mealType === "correction" ? carePlan.correctionTarget : carePlan.premealTarget;
  const input = useMemo(() => ({
    mealType,
    glucose: Number(glucose),
    carbs: Number(carbs || 0),
    activeInsulin: Number(activeInsulin || 0),
    activityAdjustmentPercent: Number(activityAdjustmentPercent || 0),
  }), [mealType, glucose, carbs, activeInsulin, activityAdjustmentPercent]);

  function clearError(name: string) {
    setFeedback(null);
    setFieldErrors((current) => clearFieldError(current, name));
  }

  function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const validation = validateForm(form);
    if (Object.keys(validation).length > 0) {
      setResult(null);
      setFieldErrors(validation);
      setFeedback({ text: "Revise los campos indicados", tone: "error" });
      focusFirstError(form, validation);
      return;
    }
    setFeedback(null);
    setFieldErrors({});
    try {
      const nextResult = calculateDose(carePlan, input);
      setResult(nextResult);
      setAdministeredDose(nextResult.recommendedDose === null ? "" : String(nextResult.recommendedDose));
    } catch {
      setResult(null);
      setFeedback({ text: "No se pudo calcular la dosis con el plan actual", tone: "error" });
    }
  }

  async function save() {
    if (!result || saving) return;
    setSaving(true);
    setFeedback(null);
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
      const body = (await response.json()) as ApiProblem;
      if (!response.ok) {
        const nextErrors = body.fieldErrors || {};
        setFieldErrors(nextErrors);
        setFeedback({ text: body.error || "No se pudo guardar el registro", tone: "error" });
        if (nextErrors.administeredDose) window.requestAnimationFrame(() => document.getElementById("administered-dose")?.focus());
        return;
      }
      setFeedback({ text: result.status === "blocked_low" ? "Glucosa baja registrada" : "Registro guardado", tone: "success" });
      setFieldErrors({});
      setResult(null);
      setGlucose("");
      setCarbs("");
      setNotes("");
      startTransition(() => router.refresh());
    } catch {
      setFeedback({ text: "Revise la conexión e inténtelo de nuevo", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form onSubmit={calculate} noValidate className="min-w-0">
        <h1 className="sr-only">Calcular dosis</h1>
        <Field label="Comida" htmlFor="meal-type">
          <div className="relative min-w-0">
            <Select id="meal-type" name="mealType" value={mealType} onValueChange={(value) => { setMealType(value as typeof mealType); setResult(null); setFeedback(null); }} leading={<BowlFoodIcon size={25} weight="duotone" />} className="min-h-[4.5rem] rounded-[1.5rem] border-polar/25 px-5 text-lg font-black shadow-card">
              {mealTypes.map((type) => <option key={type} value={type}>{mealLabels[type]}</option>)}
            </Select>
          </div>
        </Field>

        <div className="mt-6 grid min-w-0 grid-cols-1 gap-4 min-[360px]:grid-cols-2">
          <Field label="Glucosa" htmlFor="glucose" error={fieldErrors.glucose}>
            <div className="relative min-w-0"><Input id="glucose" name="glucose" type="number" inputMode="numeric" min="20" max="600" required placeholder="110" value={glucose} onChange={(event) => { setGlucose(event.target.value); setResult(null); clearError("glucose"); }} aria-invalid={Boolean(fieldErrors.glucose)} aria-describedby={fieldErrors.glucose ? "glucose-error" : undefined} className="min-h-[5.25rem] rounded-[1.5rem] border-2 border-polar bg-panel pr-[4.4rem] text-[clamp(1.7rem,8vw,2.35rem)] font-black tnum placeholder:text-ink-faint" /><span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-ink-soft min-[420px]:text-sm">mg/dL</span></div>
          </Field>
          <Field label="Carbohidratos" htmlFor="carbs" error={fieldErrors.carbs}>
            <div className="relative min-w-0"><Input id="carbs" name="carbs" type="number" inputMode="decimal" min="0" max="300" step="0.1" required={mealType !== "correction"} disabled={mealType === "correction"} placeholder="30" value={carbs} onChange={(event) => { setCarbs(event.target.value); setResult(null); clearError("carbs"); }} aria-invalid={Boolean(fieldErrors.carbs)} aria-describedby={fieldErrors.carbs ? "carbs-error" : undefined} className="min-h-[5.25rem] rounded-[1.5rem] border-2 border-polar bg-panel pr-10 text-[clamp(1.7rem,8vw,2.35rem)] font-black tnum placeholder:text-ink-faint" /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-ink-soft">g</span></div>
          </Field>
        </div>

        <div className="mt-5 flex min-h-16 items-center gap-4 rounded-[1.25rem] bg-surface px-5 py-4 text-sm font-extrabold text-ink">
          <TargetIcon size={24} weight="duotone" className="shrink-0 text-polar" />
          <span>Objetivo: {target} mg/dL</span>
        </div>

        <details className="group mt-4 rounded-[1.25rem] bg-surface">
          <summary className="flex min-h-16 cursor-pointer list-none items-center gap-4 px-5 font-bold text-ink [&::-webkit-details-marker]:hidden">
            <SlidersHorizontalIcon size={23} weight="bold" className="text-polar" />
            <span>Ajustes opcionales</span>
            <CaretDownIcon size={20} weight="bold" className="ml-auto transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid min-w-0 grid-cols-1 gap-4 border-t border-border px-5 pb-5 pt-4 min-[420px]:grid-cols-2">
            <Field label="Insulina activa" htmlFor="active-insulin" error={fieldErrors.activeInsulin}><Input id="active-insulin" name="activeInsulin" type="number" inputMode="decimal" min="0" max="100" step="0.1" value={activeInsulin} onChange={(event) => { setActiveInsulin(event.target.value); setResult(null); clearError("activeInsulin"); }} aria-invalid={Boolean(fieldErrors.activeInsulin)} /></Field>
            <Field label="Reducir por actividad" htmlFor="activity" error={fieldErrors.activityAdjustmentPercent}><Input id="activity" name="activityAdjustmentPercent" type="number" inputMode="numeric" min="0" max="100" value={activityAdjustmentPercent} onChange={(event) => { setActivityAdjustmentPercent(event.target.value); setResult(null); clearError("activityAdjustmentPercent"); }} aria-invalid={Boolean(fieldErrors.activityAdjustmentPercent)} /></Field>
            <Field label="Nota" htmlFor="record-notes" className="min-[420px]:col-span-2"><Textarea id="record-notes" name="notes" maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcional" /></Field>
          </div>
        </details>

        <Button type="submit" icon={<CalculatorIcon size={24} weight="bold" />} className="mt-5 min-h-16 w-full rounded-[1.5rem] text-lg">Calcular dosis</Button>
      </form>

      {result ? (
        <section className={`page-enter mt-5 rounded-[1.5rem] border p-5 shadow-card ${result.status === "blocked_low" ? "border-danger/25 bg-danger-soft" : "border-polar/20 bg-polar-soft"}`} aria-live="polite">
          {result.status === "blocked_low" ? (
            <>
              <div className="flex items-start gap-3"><ProhibitIcon size={26} weight="fill" className="mt-0.5 shrink-0 text-danger" /><div><h2 className="font-black text-danger">No calcular insulina ahora</h2><p className="mt-1 text-sm font-semibold leading-5 text-ink">La glucosa está por debajo del umbral de {carePlan.lowThreshold} mg/dL.</p></div></div>
              {carePlan.hypoTreatmentNote ? <p className="mt-4 rounded-[1rem] bg-panel px-4 py-3 text-sm font-bold leading-5 text-ink">{carePlan.hypoTreatmentNote}</p> : null}
              <Button type="button" variant="secondary" loading={saving || refreshing} onClick={save} className="mt-4 w-full">Registrar glucosa baja</Button>
            </>
          ) : (
            <>
              <div className="flex items-end justify-between gap-3"><div><p className="text-sm font-extrabold text-polar-dark">Dosis calculada</p><p className="tnum mt-1 text-4xl font-black tracking-[-0.04em]">{formatDose(result.recommendedDose)}</p></div>{result.limitedByMaximum ? <span className="text-right text-xs font-extrabold text-warning">Limitada al máximo del plan</span> : null}</div>
              <Field label="Dosis realmente administrada" htmlFor="administered-dose" className="mt-5" error={fieldErrors.administeredDose}><Input id="administered-dose" name="administeredDose" type="number" inputMode="decimal" min="0" max="200" step={carePlan.roundingIncrement} value={administeredDose} onChange={(event) => { setAdministeredDose(event.target.value); clearError("administeredDose"); }} aria-invalid={Boolean(fieldErrors.administeredDose)} /></Field>
              <p className="mt-3 text-xs font-semibold leading-5 text-ink-soft">Confirme la dosis administrada antes de guardar.</p>
              <Button type="button" loading={saving || refreshing} onClick={save} className="mt-4 w-full">Guardar registro</Button>
            </>
          )}
        </section>
      ) : null}
      {feedback ? <Notice message={feedback.text} tone={feedback.tone} className="mt-4" /> : null}

      <section className="mt-10 border-t border-border pt-7">
        <SectionHeading title="Último registro" />
        <RecentRecord record={latestRecord} />
      </section>
    </>
  );
}
