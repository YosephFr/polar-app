import {
  CalendarCheckIcon,
  ClipboardTextIcon,
  WarningIcon,
} from "@phosphor-icons/react/ssr";
import { getAppContext } from "@/lib/db/data";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { polarDateKey } from "@/lib/date-time";
import { getReportData } from "@/lib/reports";
import { GlucoseAnalytics } from "@/components/progress/glucose-analytics";
import { MascotGrid } from "@/components/progress/mascot-grid";

export const metadata = { title: "Progreso" };

export default async function ProgressPage() {
  const user = await requireUser();
  const context = await getAppContext(user.id);
  if (!context) return null;
  const report = await getReportData(user.id, context.patient.id, 90);
  const records = report.records;
  const days = new Set(records.map((record) => polarDateKey(record.occurredAt))).size;
  const administered = records.filter((record) => record.status === "administered").length;
  const lows = records.filter((record) => record.status === "blocked_low").length;

  return (
    <div className="min-w-0">
      <PageHeader title="Progreso" subtitle={context.patient.name} />

      <section className="mt-7 grid min-w-0 grid-cols-2 gap-3">
        <div className="rounded-[1.5rem] bg-polar p-5 text-on-accent shadow-action">
          <CalendarCheckIcon size={25} weight="duotone" />
          <p className="tnum mt-5 text-4xl font-black">{days}</p>
          <p className="mt-1 text-sm font-extrabold text-on-accent/85">días con registros</p>
        </div>
        <div className="rounded-[1.5rem] border border-border bg-panel p-5 shadow-card">
          <ClipboardTextIcon size={25} weight="duotone" className="text-polar" />
          <p className="tnum mt-5 text-4xl font-black">{administered}</p>
          <p className="mt-1 text-sm font-extrabold text-ink-soft">dosis confirmadas</p>
        </div>
      </section>

      {lows > 0 ? (
        <div className="mt-3 flex items-center gap-3 rounded-[1.25rem] bg-danger-soft px-5 py-4 text-danger">
          <WarningIcon size={22} weight="fill" />
          <span className="text-sm font-black">Glucosas bajas registradas: {lows}</span>
        </div>
      ) : null}

      <GlucoseAnalytics
        patientId={context.patient.id}
        points={records.map((record) => ({ id: record.id, glucose: record.glucose, occurredAt: record.occurredAt }))}
        nowIso={report.generatedAt}
        lowBoundary={report.lowBoundary}
      />

      <MascotGrid patientId={context.patient.id} days={days} activeMascot={context.patient.activeMascot} />
    </div>
  );
}
