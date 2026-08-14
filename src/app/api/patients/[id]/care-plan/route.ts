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
  highThreshold: z.number().int().min(120).max(600).default(250),
  autoFollowUpEnabled: z.boolean().default(true),
  standardFollowUpMinutes: z.number().int().min(1).max(1440).default(120),
  lowFollowUpMinutes: z.number().int().min(1).max(1440).default(15),
  highFollowUpMinutes: z.number().int().min(1).max(1440).default(30),
  roundingIncrement: z.union([z.literal(0.5), z.literal(1)]),
  maxBolus: z.number().positive().max(200).nullable(),
  ratios: z.object({ breakfast: ratio, morning_snack: ratio, lunch: ratio, afternoon_snack: ratio, dinner: ratio }),
  hypoTreatmentNote: z.string().trim().max(500).nullable(),
  emergencyContactName: z.string().trim().max(100).nullable().default(null),
  emergencyContactPhone: z.string().trim().max(40).nullable().default(null),
  emergencyServicePhone: z.string().trim().max(40).nullable().default(null),
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
