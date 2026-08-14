"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SessionUser } from "@/lib/auth/session";
import type { AppContext } from "@/lib/db/data";

type PolarContextValue = AppContext & { user: SessionUser };

const PolarContext = createContext<PolarContextValue | null>(null);

export function PolarContextProvider({ value, children }: { value: PolarContextValue; children: ReactNode }) {
  return <PolarContext.Provider value={value}>{children}</PolarContext.Provider>;
}

export function usePolar() {
  const context = useContext(PolarContext);
  if (!context) throw new Error("PolarContextProvider is missing");
  return context;
}
