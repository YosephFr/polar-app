import { randomUUID } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/auth/request";
import { getSessionUser } from "@/lib/auth/session";
import { apiError } from "@/lib/api";
import { getPatientCarePlan } from "@/lib/db/data";
import { insertMemberNotifications } from "@/lib/db/notifications";
import { db } from "@/lib/db/pool";
import { calculateDose, mealTypes } from "@/lib/domain/calculator";
import { deliverPendingPushNotifications } from "@/lib/push/delivery";
import type { RowDataPacket } from "mysql2/promise";

const schema = z.object({
  patientId: z.string().uuid(),
  mealType: z.enum(mealTypes),
  glucose: z.number().int().min(20).max(600),
  carbs: z.number().min(0).max(300),
  activeInsulin: z.number().min(0).max(100),
  activityAdjustmentPercent: z.number().min(0).max(100),
  administeredDose: z.number().min(0).max(200).nullable(),
  notes: z.string().trim().max(500).nullable(),
  occurredAt: z.string().datetime().optional(),
  clientId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicie sesión" }, { status: 401 });
    const input = schema.parse(await request.json());
    const plan = await getPatientCarePlan(user.id, input.patientId);
    const result = calculateDose(plan, input);
    const administeredDose = result.status === "blocked_low" ? null : input.administeredDose;
    const status = result.status === "blocked_low" ? "blocked_low" : administeredDose === null ? "recommended" : "administered";
    const recordId = randomUUID();
    const connection = await db().getConnection();
    let timer: { id: string; label: string; dueAt: string } | null = null;
    try {
      await connection.beginTransaction();
      if (input.clientId) {
        const [duplicates] = await connection.execute<(RowDataPacket & { id: string })[]>(
          "SELECT id FROM bolus_records WHERE patient_id = ? AND client_id = ? LIMIT 1 FOR UPDATE",
          [input.patientId, input.clientId],
        );
        if (duplicates[0]) {
          await connection.rollback();
          return NextResponse.json({ ok: true, recordId: duplicates[0].id, result, status, duplicate: true });
        }
      }
      await connection.execute(
        `INSERT INTO bolus_records (
          id, client_id, patient_id, user_id, care_plan_version, meal_type, glucose, carbs,
          target, ratio_value, correction_factor, active_insulin,
          activity_adjustment_percent, meal_dose, correction_dose,
          recommended_dose, administered_dose, status, notes, occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          recordId, input.clientId || null, input.patientId, user.id, plan.version, input.mealType,
          input.glucose, input.carbs, result.target, result.ratio,
          plan.correctionFactor, input.activeInsulin, input.activityAdjustmentPercent,
          result.mealDose, result.correctionDose, result.recommendedDose,
          administeredDose, status, input.notes, input.occurredAt ? new Date(input.occurredAt) : new Date(),
        ],
      );

      const low = input.glucose < plan.lowThreshold;
      const high = input.glucose >= plan.highThreshold;
      if (low || high) {
        await insertMemberNotifications(connection, {
          patientId: input.patientId,
          type: low ? "glucose_low" : "glucose_high",
          title: low ? "Glucosa baja registrada" : "Glucosa alta registrada",
          body: `${input.glucose} mg/dL · revise el plan acordado`,
          href: "/historial",
          sourceType: "bolus_record",
          sourceId: recordId,
          preference: "glucose_alerts",
        });
      }

      const shouldCreateTimer = plan.autoFollowUpEnabled && (low || high || administeredDose !== null);
      if (shouldCreateTimer) {
        const minutes = low
          ? plan.lowFollowUpMinutes
          : high
            ? plan.highFollowUpMinutes
            : plan.standardFollowUpMinutes;
        const label = low
          ? "Volver a medir glucosa"
          : high
            ? "Revisar glucosa"
            : "Control después de la dosis";
        const timerId = randomUUID();
        const dueAt = new Date(Date.now() + minutes * 60_000);
        await connection.execute(
          `INSERT INTO timers (id, patient_id, label, kind, source_record_id, due_at, created_by)
           VALUES (?, ?, ?, 'follow_up', ?, ?, ?)`,
          [timerId, input.patientId, label, recordId, dueAt, user.id],
        );
        timer = { id: timerId, label, dueAt: dueAt.toISOString() };
      }

      await connection.execute(
        "INSERT INTO audit_logs (id, patient_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, 'create', 'bolus_record', ?)",
        [randomUUID(), input.patientId, user.id, recordId],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    await deliverPendingPushNotifications().catch(() => undefined);
    return NextResponse.json({ ok: true, recordId, result, status, timer });
  } catch (error) {
    return apiError(error, "No se pudo guardar el registro");
  }
}
