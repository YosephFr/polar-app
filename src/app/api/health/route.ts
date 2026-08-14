import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [rows] = await db().execute<(RowDataPacket & { migrations: number })[]>(
      "SELECT COUNT(*) AS migrations FROM _polar_migrations",
    );
    return NextResponse.json(
      { status: "ok", database: "ok", migrations: rows[0]?.migrations ?? 0, revision: process.env.GIT_SHA || "development" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ status: "error", database: "error" }, { status: 503 });
  }
}

