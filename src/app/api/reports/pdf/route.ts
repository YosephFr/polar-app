import PDFDocument from "pdfkit";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { formatPolarDateTime } from "@/lib/date-time";
import { mealLabels } from "@/lib/domain/calculator";
import { getReportData, reportStatistics } from "@/lib/reports";

const schema = z.object({ patientId: z.string().uuid(), days: z.coerce.number().int() });

function pdfBuffer(document: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    document.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
  });
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Inicie sesión" }, { status: 401 });
  try {
    const url = new URL(request.url);
    const input = schema.parse({ patientId: url.searchParams.get("patientId"), days: url.searchParams.get("days") });
    const report = await getReportData(user.id, input.patientId, input.days);
    const statistics = reportStatistics(report);
    const document = new PDFDocument({ size: "A4", margin: 46, info: { Title: `Informe Polar · ${report.patientName}` } });
    const ready = pdfBuffer(document);
    document.fillColor("#088b8e").font("Helvetica-Bold").fontSize(24).text("Polar");
    document.fillColor("#24323a").fontSize(18).text(`Informe de ${report.patientName}`, { continued: false });
    document.fillColor("#5e6b7b").font("Helvetica").fontSize(10).text(`Últimos ${report.days} días · generado ${formatPolarDateTime(report.generatedAt, { dateStyle: "long", timeStyle: "short" })}`);
    document.moveDown(1.2);
    document.fillColor("#24323a").font("Helvetica-Bold").fontSize(12).text(`Registros: ${statistics.total}   Promedio: ${statistics.average ?? "—"} mg/dL`);
    document.moveDown(0.5);
    document.font("Helvetica").fontSize(10).text(`≤ ${report.lowBoundary}: ${statistics.low}%    ${report.lowBoundary + 1}–180: ${statistics.inRange}%    181–240: ${statistics.elevated}%    > 240: ${statistics.high}%`);
    document.moveDown(1.2);
    document.font("Helvetica-Bold").fontSize(11).text("Fecha", 46, document.y, { width: 115, continued: false });
    const headerY = document.y - 13;
    document.text("Tipo", 165, headerY, { width: 120 });
    document.text("Glucosa", 290, headerY, { width: 70, align: "right" });
    document.text("CHO", 370, headerY, { width: 55, align: "right" });
    document.text("Dosis", 435, headerY, { width: 70, align: "right" });
    document.moveTo(46, document.y + 4).lineTo(549, document.y + 4).strokeColor("#dde7e6").stroke();
    document.moveDown(0.8);
    for (const record of report.records) {
      if (document.y > 745) document.addPage();
      const y = document.y;
      document.fillColor(record.glucose <= report.lowBoundary ? "#c8494d" : record.glucose > 180 ? "#b86f21" : "#24323a");
      document.font("Helvetica").fontSize(9).text(formatPolarDateTime(record.occurredAt, { dateStyle: "short", timeStyle: "short" }), 46, y, { width: 115 });
      document.text(mealLabels[record.mealType], 165, y, { width: 120 });
      document.font("Helvetica-Bold").text(String(record.glucose), 290, y, { width: 70, align: "right" });
      document.font("Helvetica").text(String(record.carbs), 370, y, { width: 55, align: "right" });
      document.text(record.administeredDose === null ? "—" : `${record.administeredDose} U`, 435, y, { width: 70, align: "right" });
      document.y = y + 18;
    }
    document.moveDown(1);
    document.fillColor("#5e6b7b").font("Helvetica").fontSize(8).text("Este informe resume registros ingresados en Polar. No sustituye la evaluación del equipo de diabetes.");
    document.end();
    const buffer = await ready;
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="polar-${report.days}-dias.pdf"`,
      },
    });
  } catch {
    return Response.json({ error: "No se pudo generar el informe" }, { status: 400 });
  }
}
