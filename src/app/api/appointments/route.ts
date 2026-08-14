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
  title: z.string().trim().min(2).max(160),
  scheduledAt: z.string().datetime(),
  notes: z.string().trim().max(500).nullable(),
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
      "INSERT INTO appointments (id, patient_id, title, scheduled_at, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)",
      [id, input.patientId, input.title, new Date(input.scheduledAt), input.notes, user.id],
    );
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return apiError(error, "No se pudo guardar la cita");
  }
}
