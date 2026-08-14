import { Award, CalendarCheck2, ClipboardCheck, TriangleAlert } from "lucide-react";
import { getAppContext, listBolusRecords } from "@/lib/db/data";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Progreso" };

const milestones = [1, 3, 7, 14, 30, 60];

export default async function ProgressPage() {
  const user = await requireUser();
  const context = await getAppContext(user.id);
  if (!context) return null;
  const records = await listBolusRecords(user.id, context.patient.id, 200);
  const days = new Set(records.map((record) => record.occurredAt.slice(0, 10))).size;
  const administered = records.filter((record) => record.status === "administered").length;
  const lows = records.filter((record) => record.status === "blocked_low").length;
  const nextMilestone = milestones.find((milestone) => milestone > days);
  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-[-0.04em]">Progreso</h1>
      <p className="mt-2 text-sm font-semibold text-ink-soft">{context.patient.name}</p>
      <section className="mt-7 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-polar-soft p-5"><CalendarCheck2 size={23} className="text-polar" /><p className="tnum mt-5 text-3xl font-extrabold">{days}</p><p className="mt-1 text-sm font-bold text-ink-soft">días con registros</p></div>
        <div className="rounded-lg bg-surface p-5"><ClipboardCheck size={23} className="text-polar" /><p className="tnum mt-5 text-3xl font-extrabold">{administered}</p><p className="mt-1 text-sm font-bold text-ink-soft">dosis confirmadas</p></div>
      </section>
      {lows > 0 ? <div className="mt-3 flex items-center gap-3 rounded-lg bg-danger-soft px-5 py-4 text-danger"><TriangleAlert size={21} /><span className="text-sm font-extrabold">Glucosas bajas registradas: {lows}</span></div> : null}
      <section className="mt-8"><div className="flex items-center gap-3"><Award size={24} className="text-polar" /><h2 className="text-lg font-extrabold text-polar-dark">Hitos de constancia</h2></div><div className="mt-4 grid grid-cols-3 gap-3">{milestones.map((milestone) => { const unlocked = days >= milestone; return <div key={milestone} className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-center ${unlocked ? "border-polar/20 bg-polar-soft text-polar-dark" : "border-border bg-white text-ink-faint"}`}><span className="text-2xl" aria-hidden="true">{unlocked ? "🐻‍❄️" : "○"}</span><span className="mt-2 text-sm font-extrabold">{milestone} {milestone === 1 ? "día" : "días"}</span></div>; })}</div>{nextMilestone ? <p className="mt-4 text-sm font-semibold text-ink-soft">Próximo hito: {nextMilestone} días con al menos un registro.</p> : null}</section>
    </div>
  );
}
