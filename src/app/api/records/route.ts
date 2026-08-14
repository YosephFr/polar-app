import { randomUUID } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/auth/request";
import { getSessionUser } from "@/lib/auth/session";
import { apiError } from "@/lib/api";
import { getPatientCarePlan } from "@/lib/db/data";
import { db } from "@/lib/db/pool";
import { calculateDose, mealTypes } from "@/lib/domain/calculator";

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
    await db().execute(
      `INSERT INTO bolus_records (
        id, patient_id, user_id, care_plan_version, meal_type, glucose, carbs,
        target, ratio_value, correction_factor, active_insulin,
        activity_adjustment_percent, meal_dose, correction_dose,
        recommended_dose, administered_dose, status, notes, occurred_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recordId, input.patientId, user.id, plan.version, input.mealType,
        input.glucose, input.carbs, result.target, result.ratio,
        plan.correctionFactor, input.activeInsulin, input.activityAdjustmentPercent,
        result.mealDose, result.correctionDose, result.recommendedDose,
        administeredDose, status, input.notes, input.occurredAt ? new Date(input.occurredAt) : new Date(),
      ],
    );
    await db().execute(
      "INSERT INTO audit_logs (id, patient_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, 'create', 'bolus_record', ?)",
      [randomUUID(), input.patientId, user.id, recordId],
    );
    return NextResponse.json({ ok: true, recordId, result, status });
  } catch (error) {
    return apiError(error, "No se pudo guardar el registro");
  }
}
