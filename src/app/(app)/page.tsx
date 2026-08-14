import { DoseCalculator } from "@/components/dashboard/dose-calculator";
import { getAppContext, listBolusRecords } from "@/lib/db/data";
import { requireUser } from "@/lib/auth/session";
import { suggestMealType } from "@/lib/domain/meal-suggestion";

export default async function DashboardPage() {
  const user = await requireUser();
  const context = await getAppContext(user.id);
  if (!context) return null;
  const records = await listBolusRecords(user.id, context.patient.id, 1);
  const latestRecord = records[0] || null;
  return <DoseCalculator carePlan={context.carePlan} latestRecord={latestRecord} suggestedMeal={suggestMealType(new Date(), latestRecord)} />;
}
