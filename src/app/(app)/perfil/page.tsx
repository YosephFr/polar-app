import { ProfileClient } from "@/components/profile/profile-client";
import { getAppContext, listPatientMembers } from "@/lib/db/data";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const user = await requireUser();
  const context = await getAppContext(user.id);
  if (!context) return null;
  const members = await listPatientMembers(user.id, context.patient.id);
  return <ProfileClient activePatient={context.patient} carePlan={context.carePlan} members={members} />;
}
