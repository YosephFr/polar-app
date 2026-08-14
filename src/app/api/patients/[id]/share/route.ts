import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { NextResponse } from "next/server";
import { assertSameOrigin, normalizeUsername } from "@/lib/auth/request";
import { getSessionUser } from "@/lib/auth/session";
import { assertPatientAccess } from "@/lib/db/data";
import { db } from "@/lib/db/pool";
import { apiError } from "@/lib/api";

const schema = z.object({
  identifier: z.string().trim().min(2).max(190),
  role: z.enum(["caregiver", "patient", "clinician"]),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicie sesión" }, { status: 401 });
    const { id: patientId } = await context.params;
    const currentRole = await assertPatientAccess(user.id, patientId);
    if (!['owner', 'caregiver'].includes(currentRole)) {
      return NextResponse.json({ error: "No tiene permiso para compartir este perfil" }, { status: 403 });
    }
    const input = schema.parse(await request.json());
    const identifier = normalizeUsername(input.identifier);
    const [rows] = await db().execute<(RowDataPacket & { id: string })[]>(
      "SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1",
      [identifier, identifier],
    );
    const target = rows[0];
    if (!target) return NextResponse.json({ error: "No se encontró el usuario o correo electrónico" }, { status: 404 });
    const [patientRows] = await db().execute<RowDataPacket[]>(
      "SELECT 1 FROM patient_members WHERE user_id = ? LIMIT 1",
      [target.id],
    );
    await db().execute(
      "INSERT INTO patient_members (patient_id, user_id, role, is_default) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)",
      [patientId, target.id, input.role, patientRows[0] ? 0 : 1],
    );
    await db().execute(
      "INSERT INTO audit_logs (id, patient_id, user_id, action, entity_type, entity_id, details_json) VALUES (?, ?, ?, 'share', 'patient_member', ?, ?)",
      [randomUUID(), patientId, user.id, target.id, JSON.stringify({ role: input.role })],
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "No se pudo compartir el perfil");
  }
}
