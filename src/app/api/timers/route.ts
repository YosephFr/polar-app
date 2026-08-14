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
  kind: z.enum(["manual", "follow_up"]).default("manual"),
});

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicie sesión" }, { status: 401 });
    const patientId = z.string().uuid().parse(new URL(request.url).searchParams.get("patientId"));
    await assertPatientAccess(user.id, patientId);
    const [rows] = await db().execute(
      `SELECT id, label, due_at AS dueAt,
              CASE WHEN status = 'active' AND due_at <= UTC_TIMESTAMP(3) THEN 'due' ELSE status END AS status,
              kind, remaining_seconds AS remainingSeconds
       FROM timers
       WHERE patient_id = ? AND status IN ('active', 'paused', 'due')
       ORDER BY CASE WHEN status = 'paused' THEN 1 ELSE 0 END, due_at ASC`,
      [patientId],
    );
    return NextResponse.json({ timers: rows });
  } catch (error) {
    return apiError(error, "No se pudieron cargar los temporizadores");
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicie sesión" }, { status: 401 });
    const input = schema.parse(await request.json());
    await assertPatientAccess(user.id, input.patientId);
    const id = randomUUID();
    await db().execute(
      "INSERT INTO timers (id, patient_id, label, kind, due_at, created_by) VALUES (?, ?, ?, ?, ?, ?)",
      [id, input.patientId, input.label, input.kind, new Date(input.dueAt), user.id],
    );
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return apiError(error, "No se pudo iniciar el temporizador");
  }
}
