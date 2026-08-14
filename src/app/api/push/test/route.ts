import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/request";
import { getSessionUser } from "@/lib/auth/session";
import { assertPatientAccess } from "@/lib/db/data";
import { db } from "@/lib/db/pool";
import { deliverPendingPushNotifications } from "@/lib/push/delivery";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicie sesión" }, { status: 401 });
    const patientId = String((await request.json() as { patientId?: string }).patientId || "");
    await assertPatientAccess(user.id, patientId);
    const sourceId = randomUUID();
    await db().execute(
      `INSERT INTO notifications (
        id, user_id, patient_id, type, title, body, href, source_type, source_id
      ) VALUES (?, ?, ?, 'system', 'Notificación de prueba', 'Este dispositivo puede recibir avisos de Polar.', '/', 'push_test', ?)`,
      [randomUUID(), user.id, patientId, sourceId],
    );
    const delivery = await deliverPendingPushNotifications();
    return NextResponse.json({ ok: true, delivery });
  } catch (error) {
    return apiError(error, "No se pudo enviar la notificación de prueba");
  }
}
