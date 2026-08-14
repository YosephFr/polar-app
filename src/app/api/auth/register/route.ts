import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { assertSameOrigin, normalizeEmail, normalizeUsername } from "@/lib/auth/request";
import { db } from "@/lib/db/pool";
import { apiError } from "@/lib/api";

const schema = z.object({
  username: z.string().trim().min(2).max(32).regex(/^[a-zA-Z0-9._-]+$/),
  email: z.string().trim().email().optional().or(z.literal("")),
  displayName: z.string().trim().min(2).max(80),
  password: z.string().min(4).max(128),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const username = normalizeUsername(input.username);
    const email = normalizeEmail(input.email);
    const [existing] = await db().execute<RowDataPacket[]>(
      "SELECT id FROM users WHERE username = ? OR (? IS NOT NULL AND email = ?) LIMIT 1",
      [username, email, email],
    );
    if (existing[0]) return NextResponse.json({ error: "El usuario o correo electrónico ya está en uso" }, { status: 409 });
    const userId = randomUUID();
    await db().execute(
      "INSERT INTO users (id, username, email, display_name, password_hash) VALUES (?, ?, ?, ?, ?)",
      [userId, username, email, input.displayName, await hashPassword(input.password)],
    );
    await createSession(userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Revise los datos e inténtelo de nuevo");
  }
}
