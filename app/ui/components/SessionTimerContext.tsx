"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Hobby } from "../mock-data";

export const TIMER_REVEAL_DELAY_MS = 280;

type TimedSession = {
  hobby: Hobby;
  minutes: number;
  notes: string;
  endsAt: number;
};

const SessionTimerContext = createContext<{
  active: TimedSession | null;
  setActive: (session: TimedSession | null) => void;
} | null>(null);

export function SessionTimerProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<TimedSession | null>(null);
  return <SessionTimerContext.Provider value={{ active, setActive }}>{children}</SessionTimerContext.Provider>;
}

export function useSessionTimer() {
  const timer = useContext(SessionTimerContext);
  if (!timer) throw new Error("Session timer provider is missing.");
  return timer;
}
