"use client";

import { ChevronDown } from "lucide-react";
import { useRef, useState } from "react";

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];
const WEEK_COUNT = 52;

// Each column is a mock week, starting on Monday. Intensity runs from 0 to 4.
const WEEKS = [
  [0, 1, 0, 0, 1, 0, 0],
  [0, 0, 1, 0, 1, 0, 0],
  [1, 0, 0, 1, 0, 0, 1],
  [0, 1, 0, 0, 1, 1, 0],
  [0, 0, 1, 0, 0, 0, 0],
  [1, 0, 0, 1, 0, 0, 0],
  [0, 1, 0, 0, 0, 1, 0],
  [0, 0, 1, 0, 0, 0, 1],
  [0, 0, 0, 0, 1, 0, 0],
  [0, 1, 0, 1, 0, 0, 0],
  [1, 0, 0, 0, 1, 0, 1],
  [0, 1, 1, 0, 1, 0, 0],
  [1, 0, 1, 1, 0, 1, 0],
  [1, 1, 0, 1, 1, 0, 1],
  [2, 1, 2, 1, 1, 2, 1],
  [2, 1, 2, 3, 2, 3, 2],
  [3, 2, 3, 2, 3, 4, 3],
  [3, 4, 3, 4, 3, 4, 4],
  [4, 2, 3, 1, 4, 3, 2],
  [2, 0, 3, 4, 4, 1, 3],
  [3, 4, 2, 4, 3, 4, 4],
  [4, 3, 4, 4, 2, 4, 3],
  [3, 2, 4, 3, 1, 4, 4],
  [4, 4, 3, 2, 4, 3, 2],
  [3, 1, 4, 4, 2, 4, 3],
  [4, 3, 4, 2, 4, 1, 4],
];

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const INTENSITY_CLASSES = [
  "bg-neutral-100",
  "bg-emerald-100",
  "bg-emerald-300",
  "bg-emerald-500",
  "bg-emerald-700",
];

export default function Heatmap() {
  const [year, setYear] = useState(YEARS[0]);
  const [tileInfo, setTileInfo] = useState<{
    period: string;
    activity: string;
    left: number;
    top: number;
  } | null>(null);
  const activityCard = useRef<HTMLElement>(null);
  const yearPicker = useRef<HTMLDetailsElement>(null);
  const yearTrigger = useRef<HTMLElement>(null);

  function showTileInfo(tile: HTMLButtonElement, period: string, activity: string) {
    const card = activityCard.current?.getBoundingClientRect();
    if (!card) return;

    const bounds = tile.getBoundingClientRect();
    setTileInfo({
      period,
      activity,
      left: bounds.left + bounds.width / 2 - card.left,
      top: bounds.top - card.top - 6,
    });
  }

  function closeYearPicker() {
    yearPicker.current?.removeAttribute("open");
    yearTrigger.current?.focus();
  }

  // Reuse the sample weeks in a different order for each year.
  const yearOffset = YEARS[0] - year;
  const weeks = Array.from({ length: WEEK_COUNT }, (_, week) => {
    const sampleIndex = (week * 7 + Math.floor(week / WEEKS.length) + yearOffset * 3) % WEEKS.length;
    return WEEKS[sampleIndex];
  });
  return (
    <section ref={activityCard} aria-labelledby="practice-activity" className="relative rounded-2xl border border-neutral-200 bg-white p-4 text-neutral-800 sm:p-5 [@media(max-height:699px)]:py-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="practice-activity" className="text-2xl font-semibold tracking-tight text-neutral-900">
          Activity
        </h2>
        <details
          ref={yearPicker}
          className="group relative shrink-0"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              event.currentTarget.open = false;
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && event.currentTarget.open) {
              event.stopPropagation();
              closeYearPicker();
            }
          }}
        >
          <summary
            ref={yearTrigger}
            aria-label={`Activity year, ${year}`}
            className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm hover:bg-emerald-50 [&::-webkit-details-marker]:hidden"
          >
            {year === YEARS[0] ? "This year" : year}
            <ChevronDown aria-hidden="true" size={14} className="text-neutral-400 group-open:rotate-180" />
          </summary>
          <div role="group" aria-label="Choose an activity year" className="absolute top-full right-0 z-10 mt-1 grid w-full min-w-28 gap-0.5 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg">
            {YEARS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={year === option}
                onClick={() => {
                  setYear(option);
                  setTileInfo(null);
                  closeYearPicker();
                }}
                className="rounded-md px-2 py-1 text-left text-sm text-neutral-600 hover:bg-emerald-50 aria-pressed:bg-emerald-100 aria-pressed:text-emerald-900"
              >
                {option}
              </button>
            ))}
          </div>
        </details>
      </div>

      <div onScroll={() => setTileInfo(null)} className="mt-6 overflow-x-auto sm:mt-8 [@media(max-height:699px)]:mt-4">
        <div
          role="group"
          aria-label={`Mock practice intensity for ${year}, grouped by month and day of the week.`}
          className="grid min-w-[27rem] grid-cols-[2.25rem_repeat(12,minmax(0,1fr))] gap-1.5 sm:gap-2"
        >
          <span />
          {MONTH_LABELS.map((label) => (
            <span key={label} className="pb-1 text-center text-xs text-neutral-600">{label}</span>
          ))}
          {WEEKDAY_LABELS.flatMap((weekday, dayIndex) => [
            <span key={weekday} className="self-center text-right text-xs text-neutral-600">{weekday}</span>,
            ...MONTH_LABELS.map((label, monthIndex) => {
              const start = Math.floor(monthIndex * WEEK_COUNT / MONTH_LABELS.length);
              const end = Math.floor((monthIndex + 1) * WEEK_COUNT / MONTH_LABELS.length);
              const monthWeeks = weeks.slice(start, end);
              const total = monthWeeks.reduce((sum, week) => sum + week[dayIndex], 0);
              const intensity = total === 0 ? 0 : Math.max(1, Math.round(total / monthWeeks.length));
              const period = `${weekday} · ${label} ${year}`;
              const activity = intensity === 0 ? "No activity" : `Activity level ${intensity} of 4`;
              const showInfo = (tile: HTMLButtonElement) => showTileInfo(tile, period, activity);

              return (
                <button
                  key={`${weekday}-${label}`}
                  type="button"
                  aria-label={`${period}: ${activity}`}
                  onPointerEnter={(event) => showInfo(event.currentTarget)}
                  onPointerLeave={() => setTileInfo(null)}
                  onFocus={(event) => showInfo(event.currentTarget)}
                  onBlur={() => setTileInfo(null)}
                  onClick={(event) => showInfo(event.currentTarget)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setTileInfo(null);
                  }}
                  className={`aspect-square max-h-9 w-full cursor-pointer rounded-md inset-ring inset-ring-black/5 hover:inset-ring-black/35 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-950 motion-safe:transition-[background-color] motion-safe:duration-500 motion-safe:ease-in-out [@media(max-height:699px)]:h-5 [@media(max-height:699px)]:aspect-auto ${INTENSITY_CLASSES[intensity]}`}
                />
              );
            }),
          ])}
        </div>
      </div>

      {tileInfo && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-10 w-36 -translate-x-1/2 -translate-y-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: `clamp(5rem, ${tileInfo.left}px, calc(100% - 5rem))`, top: tileInfo.top }}
        >
          <div className="font-semibold text-neutral-900">{tileInfo.period}</div>
          <div className="mt-0.5 text-neutral-600">{tileInfo.activity}</div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-end gap-1.5 text-[11px] text-neutral-600">
        Less
        {INTENSITY_CLASSES.slice(1).map((color) => (
          <span key={color} aria-hidden="true" className={`size-3 rounded-sm inset-ring inset-ring-black/5 ${color}`} />
        ))}
        More
      </div>
    </section>
  );
}
