"use client";

import { useEffect, useState } from "react";
import { saveSession } from "../session-log";
import { TIMER_REVEAL_DELAY_MS, useSessionTimer } from "./SessionTimerContext";

const CLOCK_TICKS = Array.from({ length: 60 }, (_, index) => index);
const CLOCK_CIRCUMFERENCE = 2 * Math.PI * 48;

export default function SessionTimer() {
  const { active, setActive } = useSessionTimer();
  const [clock, setClock] = useState<{ endsAt: number; now: number } | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    if (!active) return;

    const interval = window.setInterval(() => {
      const now = Date.now();
      setClock({ endsAt: active.endsAt, now });
      if (now < active.endsAt) return;

      window.clearInterval(interval);
      try {
        saveSession(active.hobby, active.minutes, active.notes);
        setActive(null);
      } catch {
        setSaveFailed(true);
      }
    }, 200);

    return () => window.clearInterval(interval);
  }, [active, setActive]);

  if (!active) return null;

  const totalMs = active.minutes * 60_000;
  const remainingMs = clock?.endsAt === active.endsAt
    ? Math.max(0, Math.min(totalMs, active.endsAt - clock.now))
    : totalMs;
  const seconds = Math.ceil(remainingMs / 1_000);
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const fraction = remainingMs / totalMs;

  return (
    <section
      aria-labelledby="session-timer-title"
      className="flex flex-col items-center rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3 motion-safe:animate-[session-timer-pop_260ms_ease-out_backwards]"
      style={{ animationDelay: `${TIMER_REVEAL_DELAY_MS}ms` }}
    >
      <div className="flex w-full items-center justify-between gap-2 px-1">
        <h2 id="session-timer-title" className="text-sm font-semibold text-emerald-950">Session timer</h2>
        <span className="truncate text-xs font-medium text-emerald-800">{active.hobby}</span>
      </div>

      <div className="relative my-1.5 grid size-32 place-items-center rounded-full bg-white shadow-sm ring-1 ring-emerald-100">
        <svg aria-hidden="true" className="absolute inset-0 size-full" viewBox="0 0 100 100">
          {CLOCK_TICKS.map((tick) => (
            <line
              key={tick}
              x1="50" x2="50" y1="7" y2={tick % 5 === 0 ? 15 : 12}
              transform={`rotate(${tick * 6} 50 50)`}
              strokeWidth="1.2"
              strokeLinecap="round"
              className={`motion-safe:transition-colors ${tick < fraction * 60 ? "stroke-emerald-600" : "stroke-emerald-100"}`}
            />
          ))}
          <circle
            cx="50" cy="50" r="48"
            transform="rotate(-90 50 50)"
            strokeDasharray={CLOCK_CIRCUMFERENCE}
            strokeDashoffset={CLOCK_CIRCUMFERENCE * (1 - fraction)}
            className="fill-none stroke-emerald-500/55 stroke-1 motion-safe:transition-[stroke-dashoffset] motion-safe:duration-200 motion-safe:ease-linear"
          />
        </svg>
        <span role="timer" className="relative text-2xl font-semibold tracking-tight tabular-nums text-emerald-950">{time}</span>
      </div>

      <div className="flex min-h-6 flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
        {saveFailed && (
          <>
            <span role="alert" className="text-red-700">Couldn’t save this session.</span>
            <button type="button" className="cursor-pointer font-semibold text-emerald-800 hover:underline" onClick={() => {
              setSaveFailed(false);
              setActive({ ...active });
            }}>
              Retry save
            </button>
          </>
        )}
        <button type="button" className="cursor-pointer font-semibold text-emerald-800 hover:underline" onClick={() => setActive(null)}>
          Cancel timer
        </button>
      </div>
    </section>
  );
}
