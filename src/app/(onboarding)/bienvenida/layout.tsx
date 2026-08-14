import { PolarLogo } from "@/components/brand/polar-logo";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh min-w-0 overflow-x-clip bg-canvas px-4 pt-safe pb-safe sm:px-6">
      <header className="mx-auto flex h-24 w-full max-w-xl items-center">
        <PolarLogo />
      </header>
      {children}
    </div>
  );
}
