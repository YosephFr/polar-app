import { z } from "zod";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { apiError } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/request";
import { getSessionUser } from "@/lib/auth/session";
import { assertPatientAccess } from "@/lib/db/data";
import { db } from "@/lib/db/pool";
import { polarDateKey } from "@/lib/date-time";
import { mascots } from "@/lib/domain/mascots";

const schema = z.object({ mascotId: z.enum(mascots.map((mascot) => mascot.id) as [string, ...string[]]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicie sesión" }, { status: 401 });
    const { id } = await context.params;
    await assertPatientAccess(user.id, id);
    const input = schema.parse(await request.json());
    const mascot = mascots.find((item) => item.id === input.mascotId);
    if (!mascot) return NextResponse.json({ error: "Mascota no válida" }, { status: 422 });
    const [rows] = await db().execute<(RowDataPacket & { occurred_at: Date })[]>(
      "SELECT occurred_at FROM bolus_records WHERE patient_id = ? ORDER BY occurred_at DESC LIMIT 1000",
      [id],
    );
    const days = new Set(rows.map((row) => polarDateKey(row.occurred_at))).size;
    if (days < mascot.days) return NextResponse.json({ error: "Esta mascota todavía no está disponible" }, { status: 409 });
    await db().execute(
      "UPDATE patient_members SET active_mascot = ? WHERE patient_id = ? AND user_id = ?",
      [mascot.id, id, user.id],
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "No se pudo seleccionar la mascota");
  }
}
