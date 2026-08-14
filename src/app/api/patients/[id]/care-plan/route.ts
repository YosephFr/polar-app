import { z } from "zod";
import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/auth/request";
import { getSessionUser } from "@/lib/auth/session";
import { updatePatientCarePlan } from "@/lib/db/data";
import { apiError } from "@/lib/api";

const nullableNumber = z.number().nonnegative().nullable();
const ratio = z.number().min(0).max(200);
const schema = z.object({
  name: z.string().trim().min(2).max(80),
  birthDate: z.string().nullable(),
  sex: z.string().nullable(),
  basalInsulinName: z.string().trim().max(100).nullable(),
  basalDose: nullableNumber,
  rapidInsulinName: z.string().trim().max(100).nullable(),
  correctionFactor: z.number().positive().max(1000),
  premealTarget: z.number().int().min(50).max(300),
  correctionTarget: z.number().int().min(50).max(300),
  lowThreshold: z.number().int().min(40).max(100),
  roundingIncrement: z.union([z.literal(0.5), z.literal(1)]),
  maxBolus: z.number().positive().max(200).nullable(),
  ratios: z.object({ breakfast: ratio, morning_snack: ratio, lunch: ratio, afternoon_snack: ratio, dinner: ratio }),
  hypoTreatmentNote: z.string().trim().max(500).nullable(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicie sesión" }, { status: 401 });
    const { id } = await context.params;
    const version = await updatePatientCarePlan(user.id, id, schema.parse(await request.json()));
    return NextResponse.json({ ok: true, version });
  } catch (error) {
    return apiError(error, "No se pudo actualizar el plan");
  }
}
