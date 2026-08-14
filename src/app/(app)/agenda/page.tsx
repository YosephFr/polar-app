import { AgendaClient } from "@/components/agenda/agenda-client";
import { getAppContext, listAgenda, listCalendarMonth } from "@/lib/db/data";
import { requireUser } from "@/lib/auth/session";
import { polarDateKey } from "@/lib/date-time";

export const metadata = { title: "Agenda" };

export default async function AgendaPage() {
  const user = await requireUser();
  const context = await getAppContext(user.id);
  if (!context) return null;
  const todayKey = polarDateKey(new Date());
  const [agenda, calendar] = await Promise.all([
    listAgenda(user.id, context.patient.id),
    listCalendarMonth(user.id, context.patient.id, todayKey.slice(0, 7)),
  ]);
  return <AgendaClient appointments={agenda.appointments} calendar={calendar} todayKey={todayKey} />;
}
