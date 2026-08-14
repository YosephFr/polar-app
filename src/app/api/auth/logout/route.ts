import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/auth/request";
import { destroySession } from "@/lib/auth/session";
import { apiError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "No se pudo cerrar la sesión");
  }
}
