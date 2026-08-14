import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { NextResponse } from "next/server";
import { assertSameOrigin, normalizeUsername } from "@/lib/auth/request";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db/pool";
import { apiError } from "@/lib/api";

type UserRow = RowDataPacket & { id: string; password_hash: string };

const schema = z.object({
  identifier: z.string().trim().min(2).max(190),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const identifier = normalizeUsername(input.identifier);
    const [rows] = await db().execute<UserRow[]>(
      "SELECT id, password_hash FROM users WHERE username = ? OR email = ? LIMIT 1",
      [identifier, identifier],
    );
    const user = rows[0];
    if (!user || !(await verifyPassword(input.password, user.password_hash))) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "No se pudo iniciar sesión");
  }
}
