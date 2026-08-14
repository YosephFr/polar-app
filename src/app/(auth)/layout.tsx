import Link from "next/link";
import { PolarLogo } from "@/components/brand/polar-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh min-w-0 flex-col overflow-x-clip bg-canvas px-4 pt-safe pb-safe sm:px-6">
      <header className="mx-auto flex w-full max-w-md justify-center pb-5 pt-8 sm:justify-start sm:pt-10">
        <Link href="/entrar" aria-label="Polar" className="rounded-md">
          <PolarLogo />
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center pb-10 sm:pb-16">
        <section className="rounded-[1.875rem] border border-polar/10 bg-panel p-6 shadow-card sm:p-9">
          {children}
        </section>
      </main>
    </div>
  );
}
