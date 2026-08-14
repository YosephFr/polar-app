"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Plus, Save, Share2, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { PatientCarePlan, PatientSummary } from "@/lib/db/data";
import { usePolar } from "@/components/app/app-context";

type Member = { id: string; username: string; displayName: string; role: string };

const roleLabels: Record<string, string> = { owner: "Responsable", caregiver: "Cuidador/a", patient: "Paciente", clinician: "Profesional" };

function formNumber(form: FormData, name: string, nullable = false) {
  const value = String(form.get(name) || "").trim();
  if (!value && nullable) return null;
  return Number(value);
}

export function ProfileClient({ activePatient, carePlan, members }: { activePatient: PatientSummary; carePlan: PatientCarePlan; members: Member[] }) {
  const { user } = usePolar();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function share(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/patients/${activePatient.id}/share`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: String(form.get("identifier")), role: String(form.get("role")) }) });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) setMessage(body.error || "No se pudo compartir el perfil");
      else { event.currentTarget.reset(); setMessage("Acceso compartido"); router.refresh(); }
    } catch { setMessage("Revise la conexión e inténtelo de nuevo"); }
    finally { setBusy(false); }
  }

  async function updatePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/patients/${activePatient.id}/care-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name")), birthDate: String(form.get("birthDate") || "") || null, sex: String(form.get("sex") || "") || null,
          basalInsulinName: String(form.get("basalInsulinName") || "") || null, basalDose: formNumber(form, "basalDose", true), rapidInsulinName: String(form.get("rapidInsulinName") || "") || null,
          correctionFactor: formNumber(form, "correctionFactor"), premealTarget: formNumber(form, "premealTarget"), correctionTarget: formNumber(form, "correctionTarget"), lowThreshold: formNumber(form, "lowThreshold"), roundingIncrement: formNumber(form, "roundingIncrement"), maxBolus: formNumber(form, "maxBolus", true),
          ratios: { breakfast: formNumber(form, "ratioBreakfast"), morning_snack: formNumber(form, "ratioMorningSnack"), lunch: formNumber(form, "ratioLunch"), afternoon_snack: formNumber(form, "ratioAfternoonSnack"), dinner: formNumber(form, "ratioDinner") },
          hypoTreatmentNote: String(form.get("hypoTreatmentNote") || "") || null,
        }),
      });
      const body = (await response.json()) as { error?: string; version?: number };
      if (!response.ok) setMessage(body.error || "No se pudo actualizar el plan");
      else { setMessage(`Plan actualizado a la versión ${body.version}`); router.refresh(); }
    } catch { setMessage("Revise la conexión e inténtelo de nuevo"); }
    finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/entrar");
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-[-0.04em]">Perfil</h1>
      <div className="mt-7 flex items-center gap-4 border-b border-border pb-6"><span className="flex size-14 items-center justify-center rounded-full bg-polar-soft text-polar"><UserRound size={27} /></span><div className="min-w-0"><h2 className="truncate text-xl font-extrabold">{user.displayName}</h2><p className="truncate text-sm font-semibold text-ink-soft">@{user.username}{user.email ? ` · ${user.email}` : ""}</p></div></div>

      <section className="mt-7"><div className="flex items-center justify-between gap-4"><h2 className="text-lg font-extrabold text-polar-dark">Personas acompañadas</h2><Link href="/bienvenida?nuevo=1" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-polar"><Plus size={18} />Añadir</Link></div><div className="mt-3 rounded-lg bg-surface px-4 py-4"><p className="font-extrabold">{activePatient.name}</p><p className="mt-1 text-sm font-semibold text-ink-soft">Diabetes tipo 1 · Rol: {roleLabels[activePatient.role] || activePatient.role}</p></div></section>

      <section className="mt-8 border-t border-border pt-7"><div className="flex items-center gap-3"><Share2 size={22} className="text-polar" /><h2 className="text-lg font-extrabold text-polar-dark">Compartir perfil</h2></div><p className="mt-2 text-sm leading-5 text-ink-soft">La cuenta debe existir antes de compartir el perfil.</p><form onSubmit={share} className="mt-5 flex flex-col gap-4"><Field label="Usuario o correo electrónico" htmlFor="share-identifier"><Input id="share-identifier" name="identifier" required autoCapitalize="none" /></Field><Field label="Rol" htmlFor="share-role"><Select id="share-role" name="role" defaultValue="caregiver"><option value="caregiver">Cuidador/a</option><option value="patient">Paciente</option><option value="clinician">Profesional</option></Select></Field><Button type="submit" loading={busy} icon={<Share2 size={19} />}>Compartir acceso</Button></form><div className="mt-5 divide-y divide-border">{members.map((member) => <div key={member.id} className="flex items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-extrabold">{member.displayName}</p><p className="truncate text-xs font-semibold text-ink-soft">@{member.username}</p></div><span className="text-xs font-bold text-polar-dark">{roleLabels[member.role] || member.role}</span></div>)}</div></section>

      <details className="group mt-8 border-t border-border pt-7"><summary className="flex cursor-pointer list-none items-center gap-3 text-lg font-extrabold text-polar-dark [&::-webkit-details-marker]:hidden"><ShieldCheck size={23} />Plan de cálculo · versión {carePlan.version}<span className="ml-auto text-sm text-polar group-open:hidden">Editar</span></summary><div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-surface p-4 text-sm"><span className="text-ink-soft">Factor de corrección</span><strong className="text-right">{carePlan.correctionFactor}</strong><span className="text-ink-soft">Objetivo precomida</span><strong className="text-right">{carePlan.premealTarget} mg/dL</strong><span className="text-ink-soft">Objetivo corrección</span><strong className="text-right">{carePlan.correctionTarget} mg/dL</strong><span className="text-ink-soft">Umbral bajo</span><strong className="text-right">{carePlan.lowThreshold} mg/dL</strong></div>
        <form onSubmit={updatePlan} className="mt-6 flex flex-col gap-4">
          <Field label="Nombre" htmlFor="edit-name"><Input id="edit-name" name="name" defaultValue={activePatient.name} required /></Field>
          <div className="grid grid-cols-2 gap-4"><Field label="Nacimiento" htmlFor="edit-birth"><Input id="edit-birth" name="birthDate" type="date" defaultValue={activePatient.birthDate || ""} /></Field><Field label="Género" htmlFor="edit-sex"><Select id="edit-sex" name="sex" defaultValue={activePatient.sex || ""}><option value="">Sin indicar</option><option value="female">Femenino</option><option value="male">Masculino</option><option value="other">Otro</option></Select></Field></div>
          <div className="grid grid-cols-2 gap-4"><Field label="Insulina basal" htmlFor="edit-basal"><Input id="edit-basal" name="basalInsulinName" defaultValue={carePlan.basalInsulinName || ""} /></Field><Field label="Dosis basal" htmlFor="edit-basal-dose"><Input id="edit-basal-dose" name="basalDose" type="number" step="0.5" min="0" defaultValue={carePlan.basalDose ?? ""} /></Field></div>
          <Field label="Insulina rápida" htmlFor="edit-rapid"><Input id="edit-rapid" name="rapidInsulinName" defaultValue={carePlan.rapidInsulinName || ""} /></Field>
          <div className="grid grid-cols-2 gap-4"><Field label="Factor corrección" htmlFor="edit-factor"><Input id="edit-factor" name="correctionFactor" type="number" step="0.1" min="1" defaultValue={carePlan.correctionFactor} required /></Field><Field label="Umbral bajo" htmlFor="edit-low"><Input id="edit-low" name="lowThreshold" type="number" min="40" max="100" defaultValue={carePlan.lowThreshold} required /></Field><Field label="Objetivo precomida" htmlFor="edit-premeal"><Input id="edit-premeal" name="premealTarget" type="number" min="50" max="300" defaultValue={carePlan.premealTarget} required /></Field><Field label="Objetivo corrección" htmlFor="edit-correction"><Input id="edit-correction" name="correctionTarget" type="number" min="50" max="300" defaultValue={carePlan.correctionTarget} required /></Field><Field label="Redondeo" htmlFor="edit-round"><Select id="edit-round" name="roundingIncrement" defaultValue={String(carePlan.roundingIncrement)}><option value="1">1 unidad</option><option value="0.5">0,5 unidades</option></Select></Field><Field label="Máximo opcional" htmlFor="edit-max"><Input id="edit-max" name="maxBolus" type="number" min="0.5" step="0.5" defaultValue={carePlan.maxBolus ?? ""} /></Field></div>
          <h3 className="mt-2 font-extrabold">Ratios por comida</h3><div className="grid grid-cols-2 gap-4"><Field label="Desayuno" htmlFor="edit-r-breakfast"><Input id="edit-r-breakfast" name="ratioBreakfast" type="number" min="0" step="0.1" defaultValue={carePlan.ratios.breakfast} required /></Field><Field label="Colación" htmlFor="edit-r-snack"><Input id="edit-r-snack" name="ratioMorningSnack" type="number" min="0" step="0.1" defaultValue={carePlan.ratios.morning_snack} required /></Field><Field label="Almuerzo" htmlFor="edit-r-lunch"><Input id="edit-r-lunch" name="ratioLunch" type="number" min="0" step="0.1" defaultValue={carePlan.ratios.lunch} required /></Field><Field label="Merienda" htmlFor="edit-r-afternoon"><Input id="edit-r-afternoon" name="ratioAfternoonSnack" type="number" min="0" step="0.1" defaultValue={carePlan.ratios.afternoon_snack} required /></Field><Field label="Cena" htmlFor="edit-r-dinner" className="col-span-2"><Input id="edit-r-dinner" name="ratioDinner" type="number" min="0" step="0.1" defaultValue={carePlan.ratios.dinner} required /></Field></div>
          <Field label="Plan para una baja" htmlFor="edit-hypo"><Textarea id="edit-hypo" name="hypoTreatmentNote" defaultValue={carePlan.hypoTreatmentNote || ""} /></Field>
          <Button type="submit" loading={busy} icon={<Save size={19} />}>Guardar nueva versión</Button>
        </form>
      </details>

      {message ? <p className="mt-5 rounded-md bg-surface px-4 py-3 text-sm font-bold" role="status">{message}</p> : null}
      <Button type="button" variant="ghost" onClick={logout} loading={busy} icon={<LogOut size={19} />} className="mt-9 w-full">Cerrar sesión</Button>
    </div>
  );
}
