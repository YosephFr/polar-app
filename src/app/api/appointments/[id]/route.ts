import { z } from "zod";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { apiError } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/request";
import { getSessionUser } from "@/lib/auth/session";
import { assertPatientAccess } from "@/lib/db/data";
import { db } from "@/lib/db/pool";

const updateSchema = z.object({
  action: z.enum(["restore", "update"]),
  title: z.string().trim().min(2).max(160).optional(),
  scheduledAt: z.string().datetime().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  reminderMinutes: z.number().int().min(0).max(10080).optional(),
});

async function appointmentPatient(id: string) {
  const [rows] = await db().execute<(RowDataPacket & { patient_id: string })[]>(
    "SELECT patient_id FROM appointments WHERE id = ? LIMIT 1",
    [id],
  );
  return rows[0]?.patient_id || null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicie sesión" }, { status: 401 });
    const { id } = await context.params;
    const patientId = await appointmentPatient(id);
    if (!patientId) return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    await assertPatientAccess(user.id, patientId);
    const input = updateSchema.parse(await request.json());
    if (input.action === "restore") {
      await db().execute(
        "UPDATE appointments SET status = 'active', reminder_sent_at = NULL WHERE id = ?",
        [id],
      );
    } else {
      await db().execute(
        `UPDATE appointments SET
          title = COALESCE(?, title), scheduled_at = COALESCE(?, scheduled_at),
          notes = IF(? = 1, ?, notes), reminder_minutes = COALESCE(?, reminder_minutes),
          reminder_sent_at = NULL
         WHERE id = ?`,
        [
          input.title || null,
          input.scheduledAt ? new Date(input.scheduledAt) : null,
          input.notes !== undefined,
          input.notes ?? null,
          input.reminderMinutes ?? null,
          id,
        ],
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "No se pudo actualizar la cita");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicie sesión" }, { status: 401 });
    const { id } = await context.params;
    const patientId = await appointmentPatient(id);
    if (!patientId) return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    await assertPatientAccess(user.id, patientId);
    await db().execute("UPDATE appointments SET status = 'cancelled' WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "No se pudo eliminar la cita");
  }
}
