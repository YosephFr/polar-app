"use client";

import { ArrowClockwiseIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto flex min-h-[55dvh] max-w-md flex-col items-center justify-center text-center">
      <span className="flex size-16 items-center justify-center rounded-[1.35rem] bg-danger-soft text-danger">
        <WarningCircleIcon size={32} weight="fill" />
      </span>
      <h1 className="mt-5 text-2xl font-black tracking-[-0.025em]">No pudimos mostrar esta sección</h1>
      <p className="mt-2 max-w-sm text-base font-semibold leading-6 text-ink-soft">
        Intente nuevamente. Los datos guardados no se han modificado.
      </p>
      <Button onClick={reset} icon={<ArrowClockwiseIcon size={21} weight="bold" />} className="mt-6 min-h-14">
        Intentar nuevamente
      </Button>
    </section>
  );
}
