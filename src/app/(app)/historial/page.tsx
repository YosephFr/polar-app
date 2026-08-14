import { Clock3, Utensils } from "lucide-react";
import { getAppContext, listBolusRecords } from "@/lib/db/data";
import { requireUser } from "@/lib/auth/session";
import { mealLabels } from "@/lib/domain/calculator";

export const metadata = { title: "Historial" };

export default async function HistoryPage() {
  const user = await requireUser();
  const context = await getAppContext(user.id);
  if (!context) return null;
  const records = await listBolusRecords(user.id, context.patient.id, 100);
  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-[-0.04em]">Historial</h1>
      <p className="mt-2 text-sm font-semibold text-ink-soft">{context.patient.name}</p>
      <div className="mt-7 flex flex-col gap-3">
        {records.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg bg-surface px-6 py-12 text-center"><Clock3 size={32} className="text-polar" /><h2 className="mt-4 font-extrabold">Sin registros</h2></div>
        ) : records.map((record) => (
          <article key={record.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-border py-4 first:pt-0">
            <span className={`flex size-11 items-center justify-center rounded-full ${record.status === "blocked_low" ? "bg-danger-soft text-danger" : "bg-polar-soft text-polar"}`}><Utensils size={21} /></span>
            <div className="min-w-0"><h2 className="font-extrabold">{mealLabels[record.mealType]}</h2><p className="mt-0.5 truncate text-xs font-semibold text-ink-soft">{record.actorName} · {new Date(record.occurredAt).toLocaleString("es-419", { dateStyle: "medium", timeStyle: "short" })}</p><p className="mt-1 text-sm font-bold text-ink">{record.glucose} mg/dL · {record.carbs} g CHO</p></div>
            <div className="text-right"><p className={`tnum text-lg font-extrabold ${record.status === "blocked_low" ? "text-danger" : "text-polar"}`}>{record.status === "blocked_low" ? "Baja" : `${record.administeredDose ?? record.recommendedDose ?? 0} U`}</p><p className="text-[0.68rem] font-bold text-ink-faint">{record.status === "administered" ? "administrada" : record.status === "recommended" ? "calculada" : "bloqueado"}</p></div>
          </article>
        ))}
      </div>
    </div>
  );
}
