import { PolarLogo } from "@/components/brand/polar-logo";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center bg-canvas px-5 text-center">
      <section className="w-full rounded-[1.875rem] border border-polar/10 bg-panel px-6 py-10 shadow-card">
        <PolarLogo />
        <h1 className="mt-9 text-2xl font-black tracking-tight">Sin conexión</h1>
        <p className="mt-3 text-base font-semibold leading-6 text-ink-soft">
          Polar volverá a estar disponible cuando se restablezca la conexión.
        </p>
      </section>
    </main>
  );
}
