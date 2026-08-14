"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/feedback";
import { clearFieldError, focusFirstError, validateForm, type ApiProblem, type FieldErrors } from "@/lib/client/form-validation";

const steps = ["Perfil", "Insulinas", "Parámetros"];

function numberValue(form: FormData, name: string, nullable = false) {
  const value = String(form.get(name) || "").trim();
  if (!value && nullable) return null;
  return Number(value);
}

export function OnboardingFlow({ adding = false }: { adding?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function clearError(name: string) {
    setError("");
    setFieldErrors((current) => clearFieldError(current, name));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (step < 2) {
      const fields = step === 0 ? ["name", "birthDate"] : ["basalDose"];
      const validation = validateForm(formElement, fields);
      if (Object.keys(validation).length > 0) {
        setFieldErrors((current) => ({ ...current, ...validation }));
        setError("Revise los campos indicados");
        focusFirstError(formElement, validation);
        return;
      }
      setError("");
      setStep((current) => current + 1);
      return;
    }
    const validation = validateForm(formElement);
    if (Object.keys(validation).length > 0) {
      setFieldErrors(validation);
      setError("Revise los campos indicados");
      focusFirstError(formElement, validation);
      return;
    }
    const form = new FormData(formElement);
    setLoading(true);
    setError("");
    setFieldErrors({});
    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name") || ""),
          birthDate: String(form.get("birthDate") || "") || null,
          sex: String(form.get("sex") || "") || null,
          basalInsulinName: String(form.get("basalInsulinName") || "") || null,
          basalDose: numberValue(form, "basalDose", true),
          rapidInsulinName: String(form.get("rapidInsulinName") || "") || null,
          correctionFactor: numberValue(form, "correctionFactor"),
          premealTarget: numberValue(form, "premealTarget"),
          correctionTarget: numberValue(form, "correctionTarget"),
          lowThreshold: numberValue(form, "lowThreshold"),
          roundingIncrement: numberValue(form, "roundingIncrement"),
          maxBolus: numberValue(form, "maxBolus", true),
          ratios: {
            breakfast: numberValue(form, "ratioBreakfast"),
            morning_snack: numberValue(form, "ratioMorningSnack"),
            lunch: numberValue(form, "ratioLunch"),
            afternoon_snack: numberValue(form, "ratioAfternoonSnack"),
            dinner: numberValue(form, "ratioDinner"),
          },
          hypoTreatmentNote: String(form.get("hypoTreatmentNote") || "") || null,
        }),
      });
      const body = (await response.json()) as ApiProblem;
      if (!response.ok) {
        setError(body.error || "No se pudo guardar el perfil");
        const nextErrors = body.fieldErrors || {};
        setFieldErrors(nextErrors);
        const first = Object.keys(nextErrors)[0];
        if (["name", "birthDate", "sex"].includes(first)) setStep(0);
        else if (["basalInsulinName", "basalDose", "rapidInsulinName"].includes(first)) setStep(1);
        else setStep(2);
        window.requestAnimationFrame(() => focusFirstError(formElement, nextErrors));
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Revise la conexión e inténtelo de nuevo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-xl pb-12">
      <div className="mb-5 grid grid-cols-3 gap-2" aria-label={`Paso ${step + 1} de 3`}>
        {steps.map((label, index) => (
          <div key={label} className="min-w-0">
            <span className={`block h-2 rounded-full transition-colors duration-300 ${index === step ? "bg-polar" : index < step ? "bg-polar/40" : "bg-border"}`} />
            <span className={`mt-1.5 hidden truncate text-center text-xs font-extrabold min-[380px]:block ${index === step ? "text-polar-dark" : "text-ink-faint"}`}>{label}</span>
          </div>
        ))}
      </div>
      <form onSubmit={submit} noValidate className="min-w-0 rounded-[1.75rem] border border-polar/10 bg-panel p-5 shadow-card sm:p-8">
        <section className={step === 0 ? "page-enter block" : "hidden"} aria-hidden={step !== 0}>
            <h1 className="text-3xl font-black tracking-[-0.035em]">{adding ? "Añadir perfil" : "Crear perfil"}</h1>
            <div className="mt-8 flex flex-col gap-5">
              <Field label="Nombre" htmlFor="patient-name" error={fieldErrors.name}><Input id="patient-name" name="name" minLength={2} maxLength={80} required autoFocus onChange={() => clearError("name")} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "patient-name-error" : undefined} /></Field>
              <Field label="Fecha de nacimiento opcional" htmlFor="patient-birth" error={fieldErrors.birthDate}><Input id="patient-birth" name="birthDate" type="date" onChange={() => clearError("birthDate")} aria-invalid={Boolean(fieldErrors.birthDate)} aria-describedby={fieldErrors.birthDate ? "patient-birth-error" : undefined} /></Field>
              <Field label="Género opcional" htmlFor="patient-sex">
                <Select id="patient-sex" name="sex" defaultValue="">
                  <option value="">Prefiero no indicar</option>
                  <option value="female">Femenino</option>
                  <option value="male">Masculino</option>
                  <option value="other">Otro</option>
                </Select>
              </Field>
            </div>
        </section>

        <div className={step === 1 ? "page-enter block" : "hidden"} aria-hidden={step !== 1}>
          <h1 className="text-3xl font-black tracking-[-0.035em]">Insulinas actuales</h1>
          <p className="mt-2 text-base font-semibold leading-6 text-ink-soft">Registre las insulinas indicadas en el plan.</p>
          <div className="mt-8 flex flex-col gap-5">
            <Field label="Insulina basal" htmlFor="basal-name" error={fieldErrors.basalInsulinName}><Input id="basal-name" name="basalInsulinName" maxLength={100} placeholder="Ej. Toujeo" onChange={() => clearError("basalInsulinName")} aria-invalid={Boolean(fieldErrors.basalInsulinName)} /></Field>
            <Field label="Dosis basal habitual" htmlFor="basal-dose" error={fieldErrors.basalDose}><Input id="basal-dose" name="basalDose" type="number" inputMode="decimal" min="0" step="0.5" placeholder="Unidades" onChange={() => clearError("basalDose")} aria-invalid={Boolean(fieldErrors.basalDose)} aria-describedby={fieldErrors.basalDose ? "basal-dose-error" : undefined} /></Field>
            <Field label="Insulina rápida" htmlFor="rapid-name" error={fieldErrors.rapidInsulinName}><Input id="rapid-name" name="rapidInsulinName" maxLength={100} placeholder="Nombre de la insulina" onChange={() => clearError("rapidInsulinName")} aria-invalid={Boolean(fieldErrors.rapidInsulinName)} /></Field>
            <div className="rounded-[1.25rem] bg-polar-soft p-4 text-sm font-bold leading-5 text-polar-dark">
              <ShieldCheckIcon className="mb-2" size={23} weight="duotone" />
              Cada modificación se guarda como una nueva versión del plan.
            </div>
          </div>
        </div>

        <div className={step === 2 ? "page-enter block" : "hidden"} aria-hidden={step !== 2}>
          <h1 className="text-3xl font-black tracking-[-0.035em]">Parámetros del cálculo</h1>
          <p className="mt-2 text-base font-semibold leading-6 text-ink-soft">Use los valores proporcionados por el equipo de diabetes.</p>
          <div className="mt-8 grid min-w-0 grid-cols-1 gap-4 min-[440px]:grid-cols-2">
            <Field label="Factor de corrección" htmlFor="correction-factor" className="min-[440px]:col-span-2" error={fieldErrors.correctionFactor}><Input id="correction-factor" name="correctionFactor" type="number" inputMode="decimal" min="1" step="0.1" required placeholder="Ej. 30" onChange={() => clearError("correctionFactor")} aria-invalid={Boolean(fieldErrors.correctionFactor)} aria-describedby={fieldErrors.correctionFactor ? "correction-factor-error" : undefined} /></Field>
            <Field label="Objetivo antes de comer" htmlFor="premeal-target" error={fieldErrors.premealTarget}><Input id="premeal-target" name="premealTarget" type="number" inputMode="numeric" min="50" max="300" defaultValue="100" required onChange={() => clearError("premealTarget")} aria-invalid={Boolean(fieldErrors.premealTarget)} /></Field>
            <Field label="Objetivo de corrección" htmlFor="correction-target" error={fieldErrors.correctionTarget}><Input id="correction-target" name="correctionTarget" type="number" inputMode="numeric" min="50" max="300" defaultValue="150" required onChange={() => clearError("correctionTarget")} aria-invalid={Boolean(fieldErrors.correctionTarget)} /></Field>
            <Field label="Umbral de glucosa baja" htmlFor="low-threshold" error={fieldErrors.lowThreshold}><Input id="low-threshold" name="lowThreshold" type="number" inputMode="numeric" min="40" max="100" defaultValue="70" required onChange={() => clearError("lowThreshold")} aria-invalid={Boolean(fieldErrors.lowThreshold)} /></Field>
            <Field label="Redondear a" htmlFor="rounding"><Select id="rounding" name="roundingIncrement" defaultValue="1"><option value="1">1 unidad</option><option value="0.5">0,5 unidades</option></Select></Field>
            <Field label="Máximo por bolo (opcional)" htmlFor="max-bolus" className="min-[440px]:col-span-2" error={fieldErrors.maxBolus}><Input id="max-bolus" name="maxBolus" type="number" inputMode="decimal" min="0.5" step="0.5" onChange={() => clearError("maxBolus")} aria-invalid={Boolean(fieldErrors.maxBolus)} /></Field>
          </div>
          <h2 className="mt-8 text-lg font-black text-polar-dark">Ratios por comida</h2>
          <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 min-[440px]:grid-cols-2">
            <Field label="Desayuno" htmlFor="ratio-breakfast" error={fieldErrors.ratioBreakfast}><Input id="ratio-breakfast" name="ratioBreakfast" type="number" min="0" max="200" step="0.1" required onChange={() => clearError("ratioBreakfast")} aria-invalid={Boolean(fieldErrors.ratioBreakfast)} /></Field>
            <Field label="Colación" htmlFor="ratio-morning" error={fieldErrors.ratioMorningSnack}><Input id="ratio-morning" name="ratioMorningSnack" type="number" min="0" max="200" step="0.1" required onChange={() => clearError("ratioMorningSnack")} aria-invalid={Boolean(fieldErrors.ratioMorningSnack)} /></Field>
            <Field label="Almuerzo" htmlFor="ratio-lunch" error={fieldErrors.ratioLunch}><Input id="ratio-lunch" name="ratioLunch" type="number" min="0" max="200" step="0.1" required onChange={() => clearError("ratioLunch")} aria-invalid={Boolean(fieldErrors.ratioLunch)} /></Field>
            <Field label="Merienda" htmlFor="ratio-afternoon" error={fieldErrors.ratioAfternoonSnack}><Input id="ratio-afternoon" name="ratioAfternoonSnack" type="number" min="0" max="200" step="0.1" required onChange={() => clearError("ratioAfternoonSnack")} aria-invalid={Boolean(fieldErrors.ratioAfternoonSnack)} /></Field>
            <Field label="Cena" htmlFor="ratio-dinner" className="min-[440px]:col-span-2" error={fieldErrors.ratioDinner}><Input id="ratio-dinner" name="ratioDinner" type="number" min="0" max="200" step="0.1" required onChange={() => clearError("ratioDinner")} aria-invalid={Boolean(fieldErrors.ratioDinner)} /></Field>
          </div>
          <Field label="Plan para glucosa baja" htmlFor="hypo-note" className="mt-6" hint="Instrucciones acordadas con el equipo de diabetes.">
            <Textarea id="hypo-note" name="hypoTreatmentNote" placeholder="Qué hacer y cuándo volver a medir" />
          </Field>
        </div>

        {error ? <Notice message={error} tone="error" className="mt-5" /> : null}
        <footer className="mt-8 flex min-w-0 gap-3">
          {step > 0 ? <Button type="button" variant="secondary" icon={<ArrowLeftIcon size={20} weight="bold" />} onClick={() => setStep((current) => current - 1)}>Volver</Button> : null}
          <Button type="submit" loading={loading} icon={step === 2 ? <CheckIcon size={20} weight="bold" /> : <ArrowRightIcon size={20} weight="bold" />} className="min-w-0 flex-1">
            {step === 2 ? (adding ? "Añadir perfil" : "Crear perfil") : "Continuar"}
          </Button>
        </footer>
      </form>
    </main>
  );
}
