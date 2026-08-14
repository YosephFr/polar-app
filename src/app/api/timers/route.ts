import { randomUUID } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/auth/request";
import { getSessionUser } from "@/lib/auth/session";
import { assertPatientAccess } from "@/lib/db/data";
import { db } from "@/lib/db/pool";
import { apiError } from "@/lib/api";

const schema = z.object({
  patientId: z.string().uuid(),
  label: z.string().trim().min(2).max(120),
  dueAt: z.string().datetime(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicie sesión" }, { status: 401 });
    const input = schema.parse(await request.json());
    await assertPatientAccess(user.id, input.patientId);
    const id = randomUUID();
    await db().execute(
      "INSERT INTO timers (id, patient_id, label, due_at, created_by) VALUES (?, ?, ?, ?, ?)",
      [id, input.patientId, input.label, new Date(input.dueAt), user.id],
    );
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return apiError(error, "No se pudo iniciar el temporizador");
  }
}
