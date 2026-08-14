import { PolarLogo } from "@/components/brand/polar-logo";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-white px-5 pt-safe pb-safe">
      <header className="mx-auto flex h-20 w-full max-w-xl items-center">
        <PolarLogo />
      </header>
      {children}
    </div>
  );
}

