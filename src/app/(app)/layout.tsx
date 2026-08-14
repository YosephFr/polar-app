import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app/app-header";
import { AppTabBar } from "@/components/app/app-tab-bar";
import { PolarContextProvider } from "@/components/app/app-context";
import { getAppContext } from "@/lib/db/data";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const context = await getAppContext(user.id);
  if (!context) redirect("/bienvenida");
  return (
    <PolarContextProvider value={{ user, ...context }}>
      <div className="min-h-dvh bg-white">
        <AppHeader />
        <main className="mx-auto w-full max-w-3xl px-5 pb-tabbar-safe pt-7 sm:px-8 sm:pt-9">{children}</main>
        <AppTabBar />
      </div>
    </PolarContextProvider>
  );
}
