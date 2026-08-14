import { z } from "zod";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/request";
import { createPatient } from "@/lib/db/data";
import { apiError } from "@/lib/api";

const optionalNumber = z.number().nonnegative().nullable();
const ratio = z.number().min(0).max(200);
const schema = z.object({
  name: z.string().trim().min(2).max(80),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  sex: z.string().trim().max(40).nullable(),
  basalInsulinName: z.string().trim().max(100).nullable(),
  basalDose: optionalNumber,
  rapidInsulinName: z.string().trim().max(100).nullable(),
  correctionFactor: z.number().positive().max(1000),
  premealTarget: z.number().int().min(50).max(300),
  correctionTarget: z.number().int().min(50).max(300),
  lowThreshold: z.number().int().min(40).max(100),
  roundingIncrement: z.union([z.literal(0.5), z.literal(1)]),
  maxBolus: z.number().positive().max(200).nullable(),
  ratios: z.object({
    breakfast: ratio,
    morning_snack: ratio,
    lunch: ratio,
    afternoon_snack: ratio,
    dinner: ratio,
  }),
  hypoTreatmentNote: z.string().trim().max(500).nullable(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicie sesión" }, { status: 401 });
    const patientId = await createPatient(user.id, schema.parse(await request.json()));
    return NextResponse.json({ ok: true, patientId });
  } catch (error) {
    return apiError(error, "Revise los parámetros e inténtelo de nuevo");
  }
}
