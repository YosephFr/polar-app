import { createHmac, timingSafeEqual } from "node:crypto";
import { closeSync, mkdirSync, openSync } from "node:fs";
import { spawn } from "node:child_process";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validSignature(body: string, signature: string | null, secret: string) {
  if (!signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export async function POST(request: Request) {
  const secret = process.env.DEPLOY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Deployment is not configured" }, { status: 503 });
  const body = await request.text();
  if (!validSignature(body, request.headers.get("x-hub-signature-256"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  const event = request.headers.get("x-github-event");
  if (event === "ping") return NextResponse.json({ ok: true });
  const payload = JSON.parse(body) as { ref?: string };
  if (event !== "push" || payload.ref !== "refs/heads/main") return NextResponse.json({ ignored: true });

  mkdirSync("logs", { recursive: true });
  const log = openSync("logs/deploy.log", "a");
  const child = spawn("/bin/bash", ["scripts/deploy.sh"], {
    cwd: process.cwd(),
    detached: true,
    env: process.env,
    stdio: ["ignore", log, log],
  });
  child.unref();
  closeSync(log);
  return NextResponse.json({ accepted: true }, { status: 202 });
}
