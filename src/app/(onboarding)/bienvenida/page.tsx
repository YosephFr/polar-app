import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { requireUser } from "@/lib/auth/session";
import { listPatients } from "@/lib/db/data";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ nuevo?: string }> }) {
  const user = await requireUser();
  const adding = (await searchParams).nuevo === "1";
  const patients = await listPatients(user.id);
  if (patients.length > 0 && !adding) redirect("/");
  return <OnboardingFlow adding={adding} />;
}

