"use client";

import { useRef } from "react";

const MINUTES_MIN = 1;
export const MINUTES_MAX = 180;
const TICK_WIDTH = 16;
const TICKS = Array.from({ length: MINUTES_MAX }, (_, index) => index + 1);

export default function DurationDial({ minutes, onChange }: { minutes: number; onChange: (value: number) => void }) {
  const drag = useRef<{ x: number; minutes: number; moved: boolean } | null>(null);
  const audio = useRef<AudioContext | null>(null);

  function update(value: number) {
    const next = Math.min(MINUTES_MAX, Math.max(MINUTES_MIN, value));
    if (next === minutes) return;
    onChange(next);

    try {
      const context = audio.current ??= new AudioContext();
      if (context.state === "suspended") void context.resume().catch(() => {});
      const click = context.createOscillator();
      const volume = context.createGain();
      const now = context.currentTime;
      click.type = "triangle";
      click.frequency.setValueAtTime(1050, now);
      volume.gain.setValueAtTime(0.045, now);
      volume.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      click.connect(volume).connect(context.destination);
      click.start(now);
      click.stop(now + 0.04);
    } catch {
      // The dial remains usable when audio is unavailable.
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-center">
      <div className="text-xl font-semibold tabular-nums text-emerald-950" aria-hidden="true">
        {minutes} <span className="text-xs font-medium text-emerald-800">min</span>
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Session duration"
        aria-valuemin={MINUTES_MIN}
        aria-valuemax={MINUTES_MAX}
        aria-valuenow={minutes}
        aria-valuetext={`${minutes} minutes`}
        className="relative h-9 touch-none cursor-ew-resize overflow-hidden rounded-md select-none focus-visible:outline-2 focus-visible:outline-emerald-700"
        onKeyDown={(event) => {
          const values: Record<string, number> = {
            ArrowLeft: minutes - 1,
            ArrowDown: minutes - 1,
            ArrowRight: minutes + 1,
            ArrowUp: minutes + 1,
            Home: MINUTES_MIN,
            End: MINUTES_MAX,
          };
          if (!(event.key in values)) return;
          event.preventDefault();
          update(values[event.key]);
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          drag.current = { x: event.clientX, minutes, moved: false };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const steps = Math.round((drag.current.x - event.clientX) / TICK_WIDTH);
          if (steps !== 0) drag.current.moved = true;
          if (drag.current.moved) update(drag.current.minutes + steps);
        }}
        onPointerUp={(event) => {
          if (drag.current && !drag.current.moved) {
            const bounds = event.currentTarget.getBoundingClientRect();
            update(minutes + Math.round((event.clientX - bounds.left - bounds.width / 2) / TICK_WIDTH));
          }
          drag.current = null;
        }}
        onLostPointerCapture={() => { drag.current = null; }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 left-1/2 flex items-end motion-safe:transition-transform motion-safe:duration-100"
          style={{ transform: `translateX(${-(minutes - 0.5) * TICK_WIDTH}px)` }}
        >
          {TICKS.map((tick) => (
            <span key={tick} className="grid w-4 shrink-0 justify-items-center">
              <span className={`w-0.5 rounded-full bg-emerald-800/30 ${tick % 5 === 0 ? "h-4" : "h-2.5"}`} />
            </span>
          ))}
        </div>
        <span aria-hidden="true" className="pointer-events-none absolute bottom-1 left-1/2 h-6 w-1 -translate-x-1/2 rounded-full bg-emerald-600" />
      </div>
    </div>
  );
}
