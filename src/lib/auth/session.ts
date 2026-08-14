import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db/pool";

const sessionCookie = "polar_session";
const sessionDurationMs = 1000 * 60 * 60 * 24 * 30;

export type SessionUser = {
  id: string;
  username: string;
  email: string | null;
  displayName: string;
};

type SessionRow = RowDataPacket & {
  id: string;
  username: string;
  email: string | null;
  display_name: string;
};

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDurationMs);
  await db().execute(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
    [randomUUID(), userId, tokenHash(token), expiresAt],
  );
  const store = await cookies();
  store.set(sessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(sessionCookie)?.value;
  if (token) await db().execute("DELETE FROM sessions WHERE token_hash = ?", [tokenHash(token)]);
  store.delete(sessionCookie);
  store.delete("polar_patient");
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(sessionCookie)?.value;
  if (!token) return null;
  const [rows] = await db().execute<SessionRow[]>(
    `SELECT u.id, u.username, u.email, u.display_name
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP(3)
     LIMIT 1`,
    [tokenHash(token)],
  );
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, username: row.username, email: row.email, displayName: row.display_name };
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  return user;
}

