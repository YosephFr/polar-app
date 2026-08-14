import Link from "next/link";
import { PolarLogo } from "@/components/brand/polar-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-white px-5 pt-safe pb-safe">
      <header className="flex justify-center pb-4 pt-10">
        <Link href="/entrar" aria-label="Polar" className="rounded-md">
          <PolarLogo />
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center pb-16">
        {children}
      </main>
    </div>
  );
}

