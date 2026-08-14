import { NextResponse } from "next/server";

export function apiError(error: unknown, fallback = "No se pudo completar la acción") {
  const known = error instanceof Error ? error.message : "";
  if (known === "Invalid request origin") return NextResponse.json({ error: "Solicitud inválida" }, { status: 403 });
  if (known === "Patient access denied") return NextResponse.json({ error: "No tiene acceso a este perfil" }, { status: 403 });
  if (known === "Care plan edit denied") return NextResponse.json({ error: "Su rol no permite editar el plan" }, { status: 403 });
  return NextResponse.json({ error: fallback }, { status: 400 });
}
