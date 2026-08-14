"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { registerServiceWorker } from "./register-sw";

type PwaUpdateValue = {
  updateReady: boolean;
  applyUpdate: () => void;
  dismissUpdate: () => void;
};

const PwaUpdateContext = createContext<PwaUpdateValue>({
  updateReady: false,
  applyUpdate: () => undefined,
  dismissUpdate: () => undefined,
});

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [updateReady, setUpdateReady] = useState(false);
  const applyRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    registerServiceWorker((apply) => {
      applyRef.current = apply;
      setUpdateReady(true);
    });
  }, []);

  const value = useMemo<PwaUpdateValue>(() => ({
    updateReady,
    applyUpdate: () => applyRef.current?.(),
    dismissUpdate: () => setUpdateReady(false),
  }), [updateReady]);

  return (
    <PwaUpdateContext.Provider value={value}>{children}</PwaUpdateContext.Provider>
  );
}

export function usePwaUpdate() {
  return useContext(PwaUpdateContext);
}
