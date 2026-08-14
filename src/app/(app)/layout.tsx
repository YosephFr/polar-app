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
      <div className="min-h-dvh min-w-0 overflow-x-clip bg-canvas">
        <AppHeader />
        <main className="app-content-bottom mx-auto min-w-0 w-full max-w-4xl px-4 pt-4 sm:px-7 sm:pt-7">{children}</main>
        <AppTabBar />
      </div>
    </PolarContextProvider>
  );
}
