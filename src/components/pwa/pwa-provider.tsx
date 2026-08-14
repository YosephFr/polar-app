"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowClockwiseIcon, XIcon } from "@phosphor-icons/react";
import { registerServiceWorker } from "./register-sw";

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [updateReady, setUpdateReady] = useState(false);
  const applyRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    registerServiceWorker((apply) => {
      applyRef.current = apply;
      setUpdateReady(true);
    });
  }, []);

  return (
    <>
      {children}
      {updateReady ? (
        <div className="fixed inset-x-4 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-md items-center gap-3 rounded-[1.5rem] border border-border bg-panel p-3 shadow-float" role="status">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[1rem] bg-polar-soft text-polar">
            <ArrowClockwiseIcon size={21} weight="bold" />
          </span>
          <p className="min-w-0 flex-1 text-sm font-bold text-ink">Hay una nueva versión de Polar</p>
          <button className="h-11 rounded-[0.875rem] bg-polar px-4 text-sm font-extrabold text-on-accent transition-transform active:scale-[0.98] active:bg-polar-dark" onClick={() => applyRef.current?.()}>
            Actualizar
          </button>
          <button className="flex size-11 items-center justify-center rounded-[0.875rem] text-ink-soft hover:bg-surface" aria-label="Más tarde" onClick={() => setUpdateReady(false)}>
            <XIcon size={20} weight="bold" />
          </button>
        </div>
      ) : null}
    </>
  );
}
