import { z } from "zod";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { assertSameOrigin } from "@/lib/auth/request";
import { getSessionUser } from "@/lib/auth/session";
import { assertPatientAccess } from "@/lib/db/data";
import { db } from "@/lib/db/pool";
import { apiError } from "@/lib/api";

const schema = z.object({ status: z.enum(["done", "cancelled"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicie sesión" }, { status: 401 });
    const { id } = await context.params;
    const [rows] = await db().execute<(RowDataPacket & { patient_id: string })[]>(
      "SELECT patient_id FROM timers WHERE id = ? LIMIT 1",
      [id],
    );
    if (!rows[0]) return NextResponse.json({ error: "Temporizador no encontrado" }, { status: 404 });
    await assertPatientAccess(user.id, rows[0].patient_id);
    const { status } = schema.parse(await request.json());
    await db().execute("UPDATE timers SET status = ? WHERE id = ?", [status, id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "No se pudo actualizar el temporizador");
  }
}
