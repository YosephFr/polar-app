import { PolarLogo } from "@/components/brand/polar-logo";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 text-center">
      <PolarLogo />
      <h1 className="mt-10 text-2xl font-extrabold tracking-tight">Sin conexión</h1>
      <p className="mt-3 max-w-sm text-base leading-6 text-ink-soft">
        Polar volverá a estar disponible cuando se restablezca la conexión.
      </p>
    </main>
  );
}
