import { z } from "zod";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { listCalendarMonth } from "@/lib/db/data";

const schema = z.object({
  patientId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicie sesión" }, { status: 401 });
    const url = new URL(request.url);
    const input = schema.parse({ patientId: url.searchParams.get("patientId"), month: url.searchParams.get("month") });
    return NextResponse.json(await listCalendarMonth(user.id, input.patientId, input.month));
  } catch (error) {
    return apiError(error, "No se pudo cargar el calendario");
  }
}
