import { randomUUID } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/request";
import { getSessionUser } from "@/lib/auth/session";
import { assertPatientAccess } from "@/lib/db/data";
import { db } from "@/lib/db/pool";

const schema = z.object({
  emergencyContactName: z.string().trim().max(100).nullable(),
  emergencyContactPhone: z.string().trim().max(40).nullable(),
  emergencyServicePhone: z.string().trim().max(40).nullable(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicie sesión" }, { status: 401 });
    const { id } = await context.params;
    const role = await assertPatientAccess(user.id, id);
    if (!["owner", "caregiver"].includes(role)) return NextResponse.json({ error: "Su rol no permite editar estos datos" }, { status: 403 });
    const input = schema.parse(await request.json());
    await db().execute(
      `UPDATE patients SET emergency_contact_name = ?, emergency_contact_phone = ?, emergency_service_phone = ?
       WHERE id = ?`,
      [input.emergencyContactName, input.emergencyContactPhone, input.emergencyServicePhone, id],
    );
    await db().execute(
      `INSERT INTO audit_logs (id, patient_id, user_id, action, entity_type, entity_id)
       VALUES (?, ?, ?, 'update', 'emergency_contacts', ?)`,
      [randomUUID(), id, user.id, id],
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "No se pudieron guardar los contactos");
  }
}
