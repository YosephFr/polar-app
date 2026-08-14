import { BowlFoodIcon, ClockCounterClockwiseIcon } from "@phosphor-icons/react/ssr";
import { getAppContext, listBolusRecords } from "@/lib/db/data";
import { requireUser } from "@/lib/auth/session";
import { mealLabels } from "@/lib/domain/calculator";
import { formatPolarDateTime } from "@/lib/date-time";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Historial" };

export default async function HistoryPage() {
  const user = await requireUser();
  const context = await getAppContext(user.id);
  if (!context) return null;
  const records = await listBolusRecords(user.id, context.patient.id, 100);

  return (
    <div className="min-w-0">
      <PageHeader title="Historial" subtitle={context.patient.name} />
      <div className="mt-7 flex min-w-0 flex-col gap-3">
        {records.length === 0 ? (
          <div className="flex flex-col items-center rounded-[1.5rem] border border-polar/10 bg-panel px-6 py-14 text-center shadow-card">
            <span className="flex size-16 items-center justify-center rounded-[1.25rem] bg-polar-soft text-polar">
              <ClockCounterClockwiseIcon size={31} weight="duotone" />
            </span>
            <h2 className="mt-4 text-lg font-black">Sin registros</h2>
            <p className="mt-1 text-sm font-semibold text-ink-soft">Los nuevos registros aparecerán aquí.</p>
          </div>
        ) : records.map((record) => (
          <article key={record.id} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-[1.35rem] border border-border bg-panel p-4 shadow-field min-[470px]:grid-cols-[auto_minmax(0,1fr)_auto] min-[470px]:items-center sm:gap-4 sm:p-5">
            <span className={`flex size-12 items-center justify-center rounded-[1rem] ${record.status === "blocked_low" ? "bg-danger-soft text-danger" : "bg-polar-soft text-polar"}`}>
              <BowlFoodIcon size={23} weight="duotone" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-black">{mealLabels[record.mealType]}</h2>
              <p className="mt-0.5 truncate text-xs font-bold text-ink-soft">{record.actorName} · {formatPolarDateTime(record.occurredAt, { dateStyle: "medium", timeStyle: "short" })}</p>
              <p className="mt-1 text-sm font-extrabold text-ink">{record.glucose} mg/dL · {record.carbs} g CHO</p>
            </div>
            <div className="col-start-2 text-left min-[470px]:col-start-auto min-[470px]:text-right">
              <p className={`tnum text-lg font-black ${record.status === "blocked_low" ? "text-danger" : "text-polar"}`}>{record.status === "blocked_low" ? "Baja" : `${record.administeredDose ?? record.recommendedDose ?? 0} U`}</p>
              <p className="text-[0.7rem] font-extrabold text-ink-faint">{record.status === "administered" ? "administrada" : record.status === "recommended" ? "calculada" : "bloqueada"}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
