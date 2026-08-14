import { z } from "zod";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/request";
import { getSessionUser } from "@/lib/auth/session";
import {
  getNotificationSnapshot,
  markNotificationsRead,
  updateNotificationPreferences,
} from "@/lib/db/notifications";

const patientIdSchema = z.string().uuid();

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("read"),
    patientId: patientIdSchema,
    ids: z.array(z.string().uuid()).max(40).optional(),
  }),
  z.object({
    action: z.literal("preferences"),
    patientId: patientIdSchema,
    preferences: z.object({
      timersEnabled: z.boolean(),
      appointmentsEnabled: z.boolean(),
      glucoseAlertsEnabled: z.boolean(),
      updatesEnabled: z.boolean(),
    }),
  }),
]);

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicie sesión" }, { status: 401 });
    const patientId = patientIdSchema.parse(new URL(request.url).searchParams.get("patientId"));
    return NextResponse.json(await getNotificationSnapshot(user.id, patientId));
  } catch (error) {
    return apiError(error, "No se pudieron cargar las notificaciones");
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicie sesión" }, { status: 401 });
    const input = actionSchema.parse(await request.json());
    if (input.action === "read") {
      await markNotificationsRead(user.id, input.patientId, input.ids);
    } else {
      await updateNotificationPreferences(user.id, input.patientId, input.preferences);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "No se pudieron actualizar las notificaciones");
  }
}
