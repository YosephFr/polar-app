import { z } from "zod";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/request";
import { getSessionUser } from "@/lib/auth/session";
import { revokePushSubscription, savePushSubscription } from "@/lib/db/notifications";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(4096),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: z.string().min(1).max(255), auth: z.string().min(1).max(255) }),
});

const saveSchema = z.object({
  subscription: subscriptionSchema,
  deviceName: z.string().trim().max(160).nullable().default(null),
});

const deleteSchema = z.object({ endpoint: z.string().url().max(4096) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicie sesión" }, { status: 401 });
    const input = saveSchema.parse(await request.json());
    await savePushSubscription(user.id, input.subscription, input.deviceName);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "No se pudo activar este dispositivo");
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicie sesión" }, { status: 401 });
    const input = deleteSchema.parse(await request.json());
    await revokePushSubscription(user.id, input.endpoint);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "No se pudo desactivar este dispositivo");
  }
}
