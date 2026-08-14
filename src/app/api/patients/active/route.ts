import { z } from "zod";
import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/auth/request";
import { getSessionUser } from "@/lib/auth/session";
import { setActivePatient } from "@/lib/db/data";
import { apiError } from "@/lib/api";

const schema = z.object({ patientId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicie sesión" }, { status: 401 });
    const { patientId } = schema.parse(await request.json());
    await setActivePatient(user.id, patientId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
