"use client";

import { useLayoutEffect, useRef } from "react";
import { MOST_PRACTICED } from "../mock-data";
import SessionTimer from "./SessionTimer";
import { TIMER_REVEAL_DELAY_MS, useSessionTimer } from "./SessionTimerContext";

export default function MostPracticed() {
  const { active } = useSessionTimer();
  const compact = active !== null;
  const card = useRef<HTMLElement>(null);
  const previousHeight = useRef(0);
  const resize = useRef<Animation | null>(null);
  const { name, totalHours, streak, percentOfGoal, lastSession } = MOST_PRACTICED;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;

  useLayoutEffect(() => {
    const element = card.current;
    if (!element) return;

    const observer = new ResizeObserver(() => {
      previousHeight.current = element.getBoundingClientRect().height;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const element = card.current;
    if (!element) return;

    const from = previousHeight.current;
    resize.current?.cancel();
    const to = element.getBoundingClientRect().height;
    previousHeight.current = to;
    if (!from || from === to || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    resize.current = element.animate([{ height: `${from}px` }, { height: `${to}px` }], {
      duration: TIMER_REVEAL_DELAY_MS,
      easing: "cubic-bezier(0.2, 0.75, 0.25, 1)",
    });
  }, [compact]);

  return (
    <div className="space-y-4">
      <section ref={card} aria-labelledby="most-practiced-title" className={`flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200 bg-white ${compact ? "p-4" : "h-full p-5"}`}>
        <div>
          <div className={compact ? "flex items-center justify-between gap-2" : "space-y-4"}>
            <div>
              <span className="text-xs font-bold tracking-wider text-emerald-700 uppercase">Most Practiced</span>
              <h2 id="most-practiced-title" className={`font-extrabold tracking-tight text-neutral-800 ${compact ? "text-2xl" : "text-3xl"}`}>{name}</h2>
              {compact && <p className="mt-1 text-xs font-semibold text-neutral-600">{totalHours} total · 🔥 {streak}-day streak</p>}
            </div>

            <div role="img" aria-label={`${percentOfGoal}% of weekly goal`} className={`relative grid shrink-0 place-items-center ${compact ? "size-16" : "mx-auto size-32"}`}>
              <svg aria-hidden="true" className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={radius} className="fill-none stroke-neutral-100" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r={radius}
                  className="fill-none stroke-emerald-600"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - percentOfGoal / 100)}
                />
              </svg>
              <div aria-hidden="true" className="text-center">
                <span className={`block font-extrabold text-neutral-800 ${compact ? "text-sm" : "text-2xl leading-none"}`}>{percentOfGoal}%</span>
                {!compact && <span className="text-[10px] font-bold text-neutral-500">of weekly goal</span>}
              </div>
            </div>
          </div>

          {!compact && (
            <dl className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="flex flex-col-reverse rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <dt className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">Total hours</dt>
                <dd className="mb-1 text-xl leading-none font-extrabold text-neutral-800">{totalHours}</dd>
              </div>
              <div className="flex flex-col-reverse rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <dt className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">Day streak</dt>
                <dd className="mb-1 text-xl leading-none font-extrabold text-neutral-800">🔥 {streak}</dd>
              </div>
            </dl>
          )}
        </div>
        <p className="mt-3 border-t border-neutral-100 pt-2 text-xs text-neutral-500">Last session: {lastSession}</p>
      </section>
      {compact && <SessionTimer />}
    </div>
  );
}
