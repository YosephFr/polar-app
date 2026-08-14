import { createHmac, timingSafeEqual } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
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

function applicationRoot() {
  const current = process.cwd();
  const candidates = [current, resolve(current, "..", "..")];
  return candidates.find((candidate) => existsSync(join(candidate, "scripts", "deploy.sh"))) || current;
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

  const root = applicationRoot();
  mkdirSync(join(root, "logs"), { recursive: true });
  const log = openSync(join(root, "logs", "deploy.log"), "a");
  const child = spawn("/bin/bash", [join(root, "scripts", "deploy.sh")], {
    cwd: root,
    detached: true,
    env: process.env,
    stdio: ["ignore", log, log],
  });
  child.unref();
  closeSync(log);
  return NextResponse.json({ accepted: true }, { status: 202 });
}
