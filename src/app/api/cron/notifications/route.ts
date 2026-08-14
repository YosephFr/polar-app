import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { dispatchScheduledNotifications } from "@/lib/push/delivery";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!secret || supplied.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(secret));
}

export async function POST(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Notification dispatcher is not configured" }, { status: 503 });
  }
  if (!authorized(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await dispatchScheduledNotifications()) });
  } catch {
    return NextResponse.json({ error: "No se pudo ejecutar el envío" }, { status: 500 });
  }
}
