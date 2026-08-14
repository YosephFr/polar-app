import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { formatPolarDateTime } from "@/lib/date-time";
import { mealLabels } from "@/lib/domain/calculator";
import { getReportData } from "@/lib/reports";

const schema = z.object({ patientId: z.string().uuid(), days: z.coerce.number().int() });

function cell(value: string | number | null) {
  let text = value === null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Inicie sesión" }, { status: 401 });
  try {
    const url = new URL(request.url);
    const input = schema.parse({ patientId: url.searchParams.get("patientId"), days: url.searchParams.get("days") });
    const report = await getReportData(user.id, input.patientId, input.days);
    const rows = [
      ["Fecha y hora", "Tipo", "Glucosa (mg/dL)", "Carbohidratos (g)", "Dosis administrada (U)", "Registrado por"],
      ...report.records.map((record) => [
        formatPolarDateTime(record.occurredAt, { dateStyle: "short", timeStyle: "short" }),
        mealLabels[record.mealType],
        record.glucose,
        record.carbs,
        record.administeredDose,
        record.actorName,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(cell).join(",")).join("\r\n")}`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="polar-${report.days}-dias.csv"`,
      },
    });
  } catch {
    return Response.json({ error: "No se pudo generar el archivo" }, { status: 400 });
  }
}
