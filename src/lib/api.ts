import { NextResponse } from "next/server";
import { ZodError, type ZodIssue } from "zod";

const fieldAliases: Record<string, string> = {
  "ratios.breakfast": "ratioBreakfast",
  "ratios.morning_snack": "ratioMorningSnack",
  "ratios.lunch": "ratioLunch",
  "ratios.afternoon_snack": "ratioAfternoonSnack",
  "ratios.dinner": "ratioDinner",
};

const fieldLabels: Record<string, string> = {
  displayName: "Nombre",
  username: "Usuario",
  email: "Correo electrónico",
  password: "Contraseña",
  identifier: "Usuario o correo electrónico",
  name: "Nombre",
  birthDate: "Fecha de nacimiento",
  sex: "Género",
  basalInsulinName: "Insulina basal",
  basalDose: "Dosis basal",
  rapidInsulinName: "Insulina rápida",
  correctionFactor: "Factor de corrección",
  premealTarget: "Objetivo antes de comer",
  correctionTarget: "Objetivo de corrección",
  lowThreshold: "Umbral de glucosa baja",
  highThreshold: "Umbral de glucosa alta",
  standardFollowUpMinutes: "Recordatorio habitual",
  lowFollowUpMinutes: "Recordatorio para glucosa baja",
  highFollowUpMinutes: "Recordatorio para glucosa alta",
  emergencyContactName: "Nombre del contacto",
  emergencyContactPhone: "Teléfono del contacto",
  emergencyServicePhone: "Teléfono de emergencias",
  roundingIncrement: "Redondeo",
  maxBolus: "Máximo por bolo",
  "ratios.breakfast": "Ratio de desayuno",
  "ratios.morning_snack": "Ratio de colación",
  "ratios.lunch": "Ratio de almuerzo",
  "ratios.afternoon_snack": "Ratio de merienda",
  "ratios.dinner": "Ratio de cena",
  title: "Título",
  scheduledAt: "Fecha y hora",
  label: "Recordatorio",
  dueAt: "Hora del recordatorio",
  glucose: "Glucosa",
  carbs: "Carbohidratos",
  administeredDose: "Dosis administrada",
  role: "Rol",
  activityAdjustmentPercent: "Ajuste por actividad",
  activeInsulin: "Insulina activa",
  notes: "Nota",
};

function issueMessage(issue: ZodIssue, path: string) {
  const label = fieldLabels[path] || "Este campo";
  if (issue.code === "invalid_type") return `${label}: ingrese un valor válido.`;
  if (issue.code === "invalid_format") return `${label}: ingrese un formato válido.`;
  if (issue.code === "invalid_value") return `${label}: seleccione una opción válida.`;
  if (issue.code === "too_small") {
    if (issue.origin === "string") {
      if (Number(issue.minimum) > 1) return `${label}: use al menos ${String(issue.minimum)} caracteres.`;
      return `${label}: complete este campo.`;
    }
    if (Number(issue.minimum) === 0 && issue.inclusive === false) return `${label}: debe ser mayor que 0.`;
    return `${label}: el valor mínimo es ${String(issue.minimum)}.`;
  }
  if (issue.code === "too_big") return `${label}: el valor máximo es ${String(issue.maximum)}.`;
  return `${label}: revise el valor ingresado.`;
}

function validationResponse(error: ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    const field = fieldAliases[path] || path || "form";
    if (!fieldErrors[field]) fieldErrors[field] = issueMessage(issue, path);
  }
  return NextResponse.json(
    { error: "Revise los campos indicados", fieldErrors },
    { status: 422 },
  );
}

export function apiError(error: unknown, fallback = "No se pudo completar la acción") {
  if (error instanceof ZodError) return validationResponse(error);
  const known = error instanceof Error ? error.message : "";
  if (known === "Invalid request origin") return NextResponse.json({ error: "Solicitud inválida" }, { status: 403 });
  if (known === "Patient access denied") return NextResponse.json({ error: "No tiene acceso a este perfil" }, { status: 403 });
  if (known === "Care plan edit denied") return NextResponse.json({ error: "Su rol no permite editar el plan" }, { status: 403 });
  return NextResponse.json({ error: fallback }, { status: 400 });
}
