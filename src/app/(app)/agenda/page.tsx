import { AgendaClient } from "@/components/agenda/agenda-client";
import { getAppContext, listAgenda } from "@/lib/db/data";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Agenda" };

export default async function AgendaPage() {
  const user = await requireUser();
  const context = await getAppContext(user.id);
  if (!context) return null;
  const agenda = await listAgenda(user.id, context.patient.id);
  return <AgendaClient {...agenda} />;
}
