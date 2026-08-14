import { z } from "zod";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { assertSameOrigin } from "@/lib/auth/request";
import { getSessionUser } from "@/lib/auth/session";
import { assertPatientAccess } from "@/lib/db/data";
import { db } from "@/lib/db/pool";
import { apiError } from "@/lib/api";

const schema = z.union([
  z.object({ action: z.enum(["done", "cancel", "pause", "resume"]), minutes: z.never().optional(), label: z.never().optional() }),
  z.object({ action: z.literal("restart"), minutes: z.number().int().min(1).max(1440) }),
  z.object({
    action: z.literal("update"),
    label: z.string().trim().min(2).max(120).optional(),
    minutes: z.number().int().min(1).max(1440).optional(),
  }).refine((input) => input.label !== undefined || input.minutes !== undefined),
  z.object({ status: z.enum(["done", "cancelled"]) }),
]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicie sesión" }, { status: 401 });
    const { id } = await context.params;
    const [rows] = await db().execute<(RowDataPacket & {
      patient_id: string;
      status: string;
      due_at: Date;
      remaining_seconds: number | null;
    })[]>(
      "SELECT patient_id, status, due_at, remaining_seconds FROM timers WHERE id = ? LIMIT 1",
      [id],
    );
    if (!rows[0]) return NextResponse.json({ error: "Temporizador no encontrado" }, { status: 404 });
    await assertPatientAccess(user.id, rows[0].patient_id);
    const parsed = schema.parse(await request.json());
    const input = "status" in parsed
      ? { action: parsed.status === "cancelled" ? "cancel" as const : "done" as const }
      : parsed;
    if (input.action === "done" || input.action === "cancel") {
      await db().execute(
        "UPDATE timers SET status = ?, remaining_seconds = NULL, paused_at = NULL WHERE id = ?",
        [input.action === "done" ? "done" : "cancelled", id],
      );
    } else if (input.action === "pause") {
      if (!["active", "due"].includes(rows[0].status)) {
        return NextResponse.json({ error: "Este temporizador no se puede pausar" }, { status: 409 });
      }
      const remaining = Math.max(0, Math.ceil((rows[0].due_at.getTime() - Date.now()) / 1000));
      await db().execute(
        "UPDATE timers SET status = 'paused', remaining_seconds = ?, paused_at = UTC_TIMESTAMP(3) WHERE id = ?",
        [remaining, id],
      );
    } else if (input.action === "resume") {
      if (rows[0].status !== "paused") {
        return NextResponse.json({ error: "Este temporizador no está en pausa" }, { status: 409 });
      }
      const remaining = Math.max(0, rows[0].remaining_seconds || 0);
      await db().execute(
        `UPDATE timers SET status = 'active', due_at = DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? SECOND),
         remaining_seconds = NULL, paused_at = NULL, notified_at = NULL WHERE id = ?`,
        [remaining, id],
      );
    } else if (input.action === "restart") {
      await db().execute(
        `UPDATE timers SET status = 'active', due_at = DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? MINUTE),
         remaining_seconds = NULL, paused_at = NULL, notified_at = NULL WHERE id = ?`,
        [input.minutes, id],
      );
    } else {
      await db().execute(
        `UPDATE timers SET label = COALESCE(?, label),
         due_at = IF(? IS NULL, due_at, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? MINUTE)),
         status = IF(? IS NULL, status, 'active'), remaining_seconds = IF(? IS NULL, remaining_seconds, NULL),
         paused_at = IF(? IS NULL, paused_at, NULL), notified_at = IF(? IS NULL, notified_at, NULL)
         WHERE id = ?`,
        [
          input.label || null,
          input.minutes ?? null,
          input.minutes ?? 0,
          input.minutes ?? null,
          input.minutes ?? null,
          input.minutes ?? null,
          input.minutes ?? null,
          id,
        ],
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "No se pudo actualizar el temporizador");
  }
}
