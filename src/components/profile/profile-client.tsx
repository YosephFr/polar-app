"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FloppyDiskIcon,
  PaletteIcon,
  PhoneCallIcon,
  PlusIcon,
  ShareNetworkIcon,
  ShieldCheckIcon,
  SignOutIcon,
  UserCircleIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Toast } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { clearFieldError, focusFirstError, validateForm, type ApiProblem, type FieldErrors } from "@/lib/client/form-validation";
import type { PatientCarePlan, PatientSummary } from "@/lib/db/data";
import { usePolar } from "@/components/app/app-context";

type Member = { id: string; username: string; displayName: string; role: string };
type BusyAction = "share" | "plan" | "contacts" | "theme" | "logout" | null;

const roleLabels: Record<string, string> = {
  owner: "Responsable",
  caregiver: "Cuidador/a",
  patient: "Paciente",
  clinician: "Profesional",
};

function formNumber(form: FormData, name: string, nullable = false) {
  const value = String(form.get(name) || "").trim();
  if (!value && nullable) return null;
  return Number(value);
}

export function ProfileClient({ activePatient, carePlan, members }: { activePatient: PatientSummary; carePlan: PatientCarePlan; members: Member[] }) {
  const { user, preferences } = usePolar();
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [refreshing, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [theme, setTheme] = useState(preferences.theme);

  function clearError(name: string) {
    setFeedback(null);
    setFieldErrors((current) => clearFieldError(current, name));
  }

  function inputFeedback(name: string, id: string) {
    return {
      onChange: () => clearError(name),
      "aria-invalid": Boolean(fieldErrors[name]),
      "aria-describedby": fieldErrors[name] ? `${id}-error` : undefined,
    };
  }

  async function share(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const validation = validateForm(formElement);
    if (Object.keys(validation).length > 0) {
      setFieldErrors(validation);
      setFeedback({ text: "Revise los campos indicados", tone: "error" });
      focusFirstError(formElement, validation);
      return;
    }
    const form = new FormData(formElement);
    setBusyAction("share");
    setFeedback(null);
    try {
      const response = await fetch(`/api/patients/${activePatient.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: String(form.get("identifier")), role: String(form.get("role")) }),
      });
      const body = (await response.json()) as ApiProblem;
      if (!response.ok) {
        const nextErrors = body.fieldErrors || {};
        setFieldErrors(nextErrors);
        setFeedback({ text: body.error || "No se pudo compartir el perfil", tone: "error" });
        focusFirstError(formElement, nextErrors);
      } else {
        formElement.reset();
        setFieldErrors({});
        setFeedback({ text: "Acceso compartido", tone: "success" });
        startTransition(() => router.refresh());
      }
    } catch {
      setFeedback({ text: "Revise la conexión e inténtelo de nuevo", tone: "error" });
    } finally {
      setBusyAction(null);
    }
  }

  async function updatePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const validation = validateForm(formElement);
    if (Object.keys(validation).length > 0) {
      setFieldErrors(validation);
      setFeedback({ text: "Revise los campos indicados", tone: "error" });
      focusFirstError(formElement, validation);
      return;
    }
    const form = new FormData(formElement);
    setBusyAction("plan");
    setFeedback(null);
    try {
      const response = await fetch(`/api/patients/${activePatient.id}/care-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name")),
          birthDate: String(form.get("birthDate") || "") || null,
          sex: String(form.get("sex") || "") || null,
          basalInsulinName: String(form.get("basalInsulinName") || "") || null,
          basalDose: formNumber(form, "basalDose", true),
          rapidInsulinName: String(form.get("rapidInsulinName") || "") || null,
          correctionFactor: formNumber(form, "correctionFactor"),
          premealTarget: formNumber(form, "premealTarget"),
          correctionTarget: formNumber(form, "correctionTarget"),
          lowThreshold: formNumber(form, "lowThreshold"),
          highThreshold: formNumber(form, "highThreshold"),
          autoFollowUpEnabled: Boolean(form.get("autoFollowUpEnabled")),
          standardFollowUpMinutes: formNumber(form, "standardFollowUpMinutes"),
          lowFollowUpMinutes: formNumber(form, "lowFollowUpMinutes"),
          highFollowUpMinutes: formNumber(form, "highFollowUpMinutes"),
          roundingIncrement: formNumber(form, "roundingIncrement"),
          maxBolus: formNumber(form, "maxBolus", true),
          ratios: {
            breakfast: formNumber(form, "ratioBreakfast"),
            morning_snack: formNumber(form, "ratioMorningSnack"),
            lunch: formNumber(form, "ratioLunch"),
            afternoon_snack: formNumber(form, "ratioAfternoonSnack"),
            dinner: formNumber(form, "ratioDinner"),
          },
          hypoTreatmentNote: String(form.get("hypoTreatmentNote") || "") || null,
        }),
      });
      const body = (await response.json()) as ApiProblem & { version?: number };
      if (!response.ok) {
        const nextErrors = body.fieldErrors || {};
        setFieldErrors(nextErrors);
        setFeedback({ text: body.error || "No se pudo actualizar el plan", tone: "error" });
        focusFirstError(formElement, nextErrors);
      } else {
        setFieldErrors({});
        setFeedback({ text: `Plan actualizado a la versión ${body.version}`, tone: "success" });
        startTransition(() => router.refresh());
      }
    } catch {
      setFeedback({ text: "Revise la conexión e inténtelo de nuevo", tone: "error" });
    } finally {
      setBusyAction(null);
    }
  }

  async function updateContacts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusyAction("contacts");
    setFeedback(null);
    try {
      const response = await fetch(`/api/patients/${activePatient.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emergencyContactName: String(form.get("emergencyContactName") || "").trim() || null,
          emergencyContactPhone: String(form.get("emergencyContactPhone") || "").trim() || null,
          emergencyServicePhone: String(form.get("emergencyServicePhone") || "").trim() || null,
        }),
      });
      const body = await response.json() as ApiProblem;
      if (!response.ok) {
        setFeedback({ text: body.error || "No se pudieron guardar los contactos", tone: "error" });
        return;
      }
      setFeedback({ text: "Contactos guardados", tone: "success" });
      startTransition(() => router.refresh());
    } catch {
      setFeedback({ text: "Revise la conexión e inténtelo de nuevo", tone: "error" });
    } finally {
      setBusyAction(null);
    }
  }

  async function updateTheme() {
    setBusyAction("theme");
    setFeedback(null);
    try {
      const response = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      if (!response.ok) {
        setFeedback({ text: "No se pudo cambiar la apariencia", tone: "error" });
        return;
      }
      setFeedback({ text: "Apariencia actualizada", tone: "success" });
      startTransition(() => router.refresh());
    } finally {
      setBusyAction(null);
    }
  }

  async function logout() {
    setBusyAction("logout");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setFeedback({ text: "No se pudo cerrar la sesión", tone: "error" });
        return;
      }
      router.push("/entrar");
      router.refresh();
    } catch {
      setFeedback({ text: "Revise la conexión e inténtelo de nuevo", tone: "error" });
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="min-w-0">
      <PageHeader title="Perfil" subtitle={activePatient.name} />

      <section className="mt-7 flex min-w-0 items-center gap-4 rounded-[1.5rem] border border-polar/10 bg-panel p-5 shadow-card">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-[1.25rem] bg-polar text-on-accent shadow-action">
          <UserCircleIcon size={33} weight="duotone" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-black">{user.displayName}</h2>
          <p className="mt-0.5 truncate text-sm font-bold text-ink-soft">@{user.username}{user.email ? ` · ${user.email}` : ""}</p>
        </div>
      </section>

      <section className="mt-7 rounded-[1.5rem] border border-polar/10 bg-panel p-4 shadow-card sm:p-6">
        <div className="flex min-w-0 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <UsersThreeIcon size={24} weight="duotone" className="shrink-0 text-polar" />
            <h2 className="truncate text-lg font-black text-polar-dark">Personas acompañadas</h2>
          </div>
          <Link href="/bienvenida?nuevo=1" className="inline-flex shrink-0 items-center gap-1.5 rounded-[0.875rem] px-2 py-1.5 text-sm font-black text-polar transition-colors hover:bg-polar-soft">
            <PlusIcon size={18} weight="bold" />Añadir
          </Link>
        </div>
        <div className="mt-4 rounded-[1.15rem] bg-surface px-4 py-4">
          <p className="font-black">{activePatient.name}</p>
          <p className="mt-1 text-sm font-bold text-ink-soft">Diabetes tipo 1 · {roleLabels[activePatient.role] || activePatient.role}</p>
        </div>
      </section>

      <section className="mt-7 rounded-[1.5rem] border border-polar/10 bg-panel p-4 shadow-card sm:p-6">
        <div className="flex items-center gap-3">
          <PhoneCallIcon size={24} weight="duotone" className="text-polar" />
          <h2 className="text-lg font-black text-polar-dark">Contactos de emergencia</h2>
        </div>
        {(activePatient.emergencyContactPhone || activePatient.emergencyServicePhone) ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {activePatient.emergencyContactPhone ? <a href={`tel:${activePatient.emergencyContactPhone.replace(/[^+\d]/g, "")}`} className="inline-flex min-h-11 items-center gap-2 rounded-[0.9rem] bg-polar px-3.5 text-sm font-black text-white"><PhoneCallIcon size={18} weight="fill" />{activePatient.emergencyContactName || "Contacto"}</a> : null}
            {activePatient.emergencyServicePhone ? <a href={`tel:${activePatient.emergencyServicePhone.replace(/[^+\d]/g, "")}`} className="inline-flex min-h-11 items-center gap-2 rounded-[0.9rem] bg-danger px-3.5 text-sm font-black text-white"><PhoneCallIcon size={18} weight="fill" />Emergencias</a> : null}
          </div>
        ) : null}
        <form onSubmit={updateContacts} className="mt-5 grid min-w-0 grid-cols-1 gap-4 min-[500px]:grid-cols-2">
          <Field label="Nombre del contacto" htmlFor="emergency-name" className="min-[500px]:col-span-2"><Input id="emergency-name" name="emergencyContactName" maxLength={100} defaultValue={activePatient.emergencyContactName || ""} /></Field>
          <Field label="Teléfono del contacto" htmlFor="emergency-phone"><Input id="emergency-phone" name="emergencyContactPhone" type="tel" inputMode="tel" maxLength={40} defaultValue={activePatient.emergencyContactPhone || ""} /></Field>
          <Field label="Teléfono de emergencias" htmlFor="emergency-service"><Input id="emergency-service" name="emergencyServicePhone" type="tel" inputMode="tel" maxLength={40} defaultValue={activePatient.emergencyServicePhone || ""} /></Field>
          <Button type="submit" loading={busyAction === "contacts" || refreshing} icon={<FloppyDiskIcon size={20} weight="bold" />} className="min-[500px]:col-span-2">Guardar contactos</Button>
        </form>
      </section>

      <section className="mt-7 rounded-[1.5rem] border border-polar/10 bg-panel p-4 shadow-card sm:p-6">
        <div className="flex items-center gap-3">
          <PaletteIcon size={24} weight="duotone" className="text-polar" />
          <h2 className="text-lg font-black text-polar-dark">Apariencia</h2>
        </div>
        <div className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 max-[390px]:grid-cols-1">
          <Select aria-label="Tema de la aplicación" value={theme} onValueChange={(value) => setTheme(value as typeof theme)}>
            <option value="polar">Polar</option>
            <option value="night">Noche</option>
            <option value="contrast">Alto contraste</option>
          </Select>
          <Button type="button" loading={busyAction === "theme" || refreshing} onClick={updateTheme} className="px-5">Aplicar</Button>
        </div>
      </section>

      <section className="mt-7 rounded-[1.5rem] border border-polar/10 bg-panel p-4 shadow-card sm:p-6">
        <div className="flex items-center gap-3">
          <ShareNetworkIcon size={24} weight="duotone" className="text-polar" />
          <h2 className="text-lg font-black text-polar-dark">Compartir perfil</h2>
        </div>
        <p className="mt-2 text-sm font-semibold leading-5 text-ink-soft">Busque una cuenta existente por su usuario o correo electrónico.</p>
        <form onSubmit={share} noValidate className="mt-5 grid min-w-0 grid-cols-1 gap-4 min-[520px]:grid-cols-[minmax(0,1fr)_12rem]">
          <Field label="Usuario o correo electrónico" htmlFor="share-identifier" error={fieldErrors.identifier}>
            <Input id="share-identifier" name="identifier" minLength={2} maxLength={190} required autoCapitalize="none" {...inputFeedback("identifier", "share-identifier")} />
          </Field>
          <Field label="Rol" htmlFor="share-role">
            <Select id="share-role" name="role" defaultValue="caregiver">
              <option value="caregiver">Cuidador/a</option>
              <option value="patient">Paciente</option>
              <option value="clinician">Profesional</option>
            </Select>
          </Field>
          <Button type="submit" loading={busyAction === "share" || refreshing} icon={<ShareNetworkIcon size={20} weight="bold" />} className="col-span-full min-h-14">Compartir acceso</Button>
        </form>
        <div className="mt-5 divide-y divide-border">
          {members.map((member) => (
            <div key={member.id} className="flex min-w-0 items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{member.displayName}</p>
                <p className="truncate text-xs font-bold text-ink-soft">@{member.username}</p>
              </div>
              <span className="shrink-0 text-xs font-extrabold text-polar-dark">{roleLabels[member.role] || member.role}</span>
            </div>
          ))}
        </div>
      </section>

      <details className="group mt-7 rounded-[1.5rem] border border-polar/10 bg-panel p-4 shadow-card sm:p-6">
        <summary className="flex min-w-0 cursor-pointer list-none items-center gap-3 text-lg font-black text-polar-dark [&::-webkit-details-marker]:hidden">
          <ShieldCheckIcon size={25} weight="duotone" className="shrink-0" />
          <span className="min-w-0 flex-1 truncate">Plan de cálculo · versión {carePlan.version}</span>
          <span className="shrink-0 text-sm font-extrabold text-polar group-open:hidden">Editar</span>
        </summary>

        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 rounded-[1.15rem] bg-surface p-4 text-sm">
          <span className="font-semibold text-ink-soft">Factor de corrección</span><strong className="text-right font-black">{carePlan.correctionFactor}</strong>
          <span className="font-semibold text-ink-soft">Objetivo precomida</span><strong className="text-right font-black">{carePlan.premealTarget} mg/dL</strong>
          <span className="font-semibold text-ink-soft">Objetivo corrección</span><strong className="text-right font-black">{carePlan.correctionTarget} mg/dL</strong>
          <span className="font-semibold text-ink-soft">Umbral bajo</span><strong className="text-right font-black">{carePlan.lowThreshold} mg/dL</strong>
        </div>

        <form onSubmit={updatePlan} noValidate className="mt-6 flex min-w-0 flex-col gap-4">
          <Field label="Nombre" htmlFor="edit-name" error={fieldErrors.name}><Input id="edit-name" name="name" minLength={2} maxLength={80} defaultValue={activePatient.name} required {...inputFeedback("name", "edit-name")} /></Field>
          <div className="grid min-w-0 grid-cols-1 gap-4 min-[460px]:grid-cols-2">
            <Field label="Nacimiento" htmlFor="edit-birth" error={fieldErrors.birthDate}><Input id="edit-birth" name="birthDate" type="date" defaultValue={activePatient.birthDate || ""} {...inputFeedback("birthDate", "edit-birth")} /></Field>
            <Field label="Género" htmlFor="edit-sex"><Select id="edit-sex" name="sex" defaultValue={activePatient.sex || ""}><option value="">Sin indicar</option><option value="female">Femenino</option><option value="male">Masculino</option><option value="other">Otro</option></Select></Field>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-4 min-[460px]:grid-cols-2">
            <Field label="Insulina basal" htmlFor="edit-basal" error={fieldErrors.basalInsulinName}><Input id="edit-basal" name="basalInsulinName" maxLength={100} defaultValue={carePlan.basalInsulinName || ""} {...inputFeedback("basalInsulinName", "edit-basal")} /></Field>
            <Field label="Dosis basal" htmlFor="edit-basal-dose" error={fieldErrors.basalDose}><Input id="edit-basal-dose" name="basalDose" type="number" step="0.5" min="0" defaultValue={carePlan.basalDose ?? ""} {...inputFeedback("basalDose", "edit-basal-dose")} /></Field>
          </div>
          <Field label="Insulina rápida" htmlFor="edit-rapid" error={fieldErrors.rapidInsulinName}><Input id="edit-rapid" name="rapidInsulinName" maxLength={100} defaultValue={carePlan.rapidInsulinName || ""} {...inputFeedback("rapidInsulinName", "edit-rapid")} /></Field>
          <div className="grid min-w-0 grid-cols-1 gap-4 min-[460px]:grid-cols-2">
            <Field label="Factor de corrección" htmlFor="edit-factor" error={fieldErrors.correctionFactor}><Input id="edit-factor" name="correctionFactor" type="number" step="0.1" min="1" max="1000" defaultValue={carePlan.correctionFactor} required {...inputFeedback("correctionFactor", "edit-factor")} /></Field>
            <Field label="Umbral bajo" htmlFor="edit-low" error={fieldErrors.lowThreshold}><Input id="edit-low" name="lowThreshold" type="number" min="40" max="100" defaultValue={carePlan.lowThreshold} required {...inputFeedback("lowThreshold", "edit-low")} /></Field>
            <Field label="Umbral alto" htmlFor="edit-high" error={fieldErrors.highThreshold}><Input id="edit-high" name="highThreshold" type="number" min="120" max="600" defaultValue={carePlan.highThreshold} required {...inputFeedback("highThreshold", "edit-high")} /></Field>
            <Field label="Objetivo precomida" htmlFor="edit-premeal" error={fieldErrors.premealTarget}><Input id="edit-premeal" name="premealTarget" type="number" min="50" max="300" defaultValue={carePlan.premealTarget} required {...inputFeedback("premealTarget", "edit-premeal")} /></Field>
            <Field label="Objetivo de corrección" htmlFor="edit-correction" error={fieldErrors.correctionTarget}><Input id="edit-correction" name="correctionTarget" type="number" min="50" max="300" defaultValue={carePlan.correctionTarget} required {...inputFeedback("correctionTarget", "edit-correction")} /></Field>
            <Field label="Redondeo" htmlFor="edit-round"><Select id="edit-round" name="roundingIncrement" defaultValue={String(carePlan.roundingIncrement)}><option value="1">1 unidad</option><option value="0.5">0,5 unidades</option></Select></Field>
            <Field label="Máximo opcional" htmlFor="edit-max" error={fieldErrors.maxBolus}><Input id="edit-max" name="maxBolus" type="number" min="0.5" max="200" step="0.5" defaultValue={carePlan.maxBolus ?? ""} {...inputFeedback("maxBolus", "edit-max")} /></Field>
          </div>
          <h3 className="mt-2 text-lg font-black text-ink">Controles posteriores</h3>
          <label className="flex min-h-12 items-center gap-3 rounded-[1rem] bg-surface px-4 text-sm font-bold text-ink">
            <input type="checkbox" name="autoFollowUpEnabled" defaultChecked={carePlan.autoFollowUpEnabled} className="size-5 accent-polar" />
            <span>Crear recordatorios después de cada registro</span>
          </label>
          <div className="grid min-w-0 grid-cols-1 gap-4 min-[460px]:grid-cols-3">
            <Field label="Habitual" htmlFor="edit-follow-standard" error={fieldErrors.standardFollowUpMinutes}><Input id="edit-follow-standard" name="standardFollowUpMinutes" type="number" min="1" max="1440" defaultValue={carePlan.standardFollowUpMinutes} required {...inputFeedback("standardFollowUpMinutes", "edit-follow-standard")} /></Field>
            <Field label="Glucosa baja" htmlFor="edit-follow-low" error={fieldErrors.lowFollowUpMinutes}><Input id="edit-follow-low" name="lowFollowUpMinutes" type="number" min="1" max="1440" defaultValue={carePlan.lowFollowUpMinutes} required {...inputFeedback("lowFollowUpMinutes", "edit-follow-low")} /></Field>
            <Field label="Glucosa alta" htmlFor="edit-follow-high" error={fieldErrors.highFollowUpMinutes}><Input id="edit-follow-high" name="highFollowUpMinutes" type="number" min="1" max="1440" defaultValue={carePlan.highFollowUpMinutes} required {...inputFeedback("highFollowUpMinutes", "edit-follow-high")} /></Field>
          </div>
          <h3 className="mt-2 text-lg font-black text-ink">Ratios por comida</h3>
          <div className="grid min-w-0 grid-cols-1 gap-4 min-[460px]:grid-cols-2">
            <Field label="Desayuno" htmlFor="edit-r-breakfast" error={fieldErrors.ratioBreakfast}><Input id="edit-r-breakfast" name="ratioBreakfast" type="number" min="0" max="200" step="0.1" defaultValue={carePlan.ratios.breakfast} required {...inputFeedback("ratioBreakfast", "edit-r-breakfast")} /></Field>
            <Field label="Colación" htmlFor="edit-r-snack" error={fieldErrors.ratioMorningSnack}><Input id="edit-r-snack" name="ratioMorningSnack" type="number" min="0" max="200" step="0.1" defaultValue={carePlan.ratios.morning_snack} required {...inputFeedback("ratioMorningSnack", "edit-r-snack")} /></Field>
            <Field label="Almuerzo" htmlFor="edit-r-lunch" error={fieldErrors.ratioLunch}><Input id="edit-r-lunch" name="ratioLunch" type="number" min="0" max="200" step="0.1" defaultValue={carePlan.ratios.lunch} required {...inputFeedback("ratioLunch", "edit-r-lunch")} /></Field>
            <Field label="Merienda" htmlFor="edit-r-afternoon" error={fieldErrors.ratioAfternoonSnack}><Input id="edit-r-afternoon" name="ratioAfternoonSnack" type="number" min="0" max="200" step="0.1" defaultValue={carePlan.ratios.afternoon_snack} required {...inputFeedback("ratioAfternoonSnack", "edit-r-afternoon")} /></Field>
            <Field label="Cena" htmlFor="edit-r-dinner" className="min-[460px]:col-span-2" error={fieldErrors.ratioDinner}><Input id="edit-r-dinner" name="ratioDinner" type="number" min="0" max="200" step="0.1" defaultValue={carePlan.ratios.dinner} required {...inputFeedback("ratioDinner", "edit-r-dinner")} /></Field>
          </div>
          <Field label="Plan para una baja" htmlFor="edit-hypo" error={fieldErrors.hypoTreatmentNote}><Textarea id="edit-hypo" name="hypoTreatmentNote" maxLength={500} defaultValue={carePlan.hypoTreatmentNote || ""} {...inputFeedback("hypoTreatmentNote", "edit-hypo")} /></Field>
          <Button type="submit" loading={busyAction === "plan" || refreshing} icon={<FloppyDiskIcon size={20} weight="bold" />} className="min-h-14">Guardar nueva versión</Button>
        </form>
      </details>

      {feedback ? <Toast message={feedback.text} tone={feedback.tone} onDismiss={() => setFeedback(null)} /> : null}
      <Button type="button" variant="ghost" onClick={logout} loading={busyAction === "logout"} icon={<SignOutIcon size={20} weight="bold" />} className="mt-7 w-full">Cerrar sesión</Button>
    </div>
  );
}
