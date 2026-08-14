import { z } from "zod";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/request";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db/pool";

const schema = z.object({ theme: z.enum(["polar", "night", "contrast"]) });

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Inicie sesión" }, { status: 401 });
    const input = schema.parse(await request.json());
    await db().execute(
      `INSERT INTO user_preferences (user_id, theme) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE theme = VALUES(theme)`,
      [user.id, input.theme],
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "No se pudo cambiar la apariencia");
  }
}
