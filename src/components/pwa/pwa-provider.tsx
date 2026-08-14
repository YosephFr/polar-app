"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
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
        <div className="fixed inset-x-4 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-60 mx-auto flex max-w-md items-center gap-3 rounded-lg border border-border bg-white p-3 shadow-soft" role="status">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-polar-soft text-polar">
            <RefreshCw size={20} />
          </span>
          <p className="min-w-0 flex-1 text-sm font-semibold text-ink">Hay una nueva versión de Polar</p>
          <button className="h-10 rounded-md bg-polar px-4 text-sm font-bold text-white active:bg-polar-dark" onClick={() => applyRef.current?.()}>
            Actualizar
          </button>
          <button className="flex size-10 items-center justify-center rounded-md text-ink-soft" aria-label="Más tarde" onClick={() => setUpdateReady(false)}>
            <X size={20} />
          </button>
        </div>
      ) : null}
    </>
  );
}
