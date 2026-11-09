"use client";

import { ArrowLeft, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getActivityMonths, MONTH_LABELS, YEARS } from "../mock-data";

const MONTH_NAME = new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" });
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const INTENSITY_CLASSES = [
  "bg-neutral-100",
  "bg-emerald-100",
  "bg-emerald-300",
  "bg-emerald-500",
  "bg-emerald-700",
];

export default function Heatmap() {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [monthZoom, setMonthZoom] = useState<{ month: number; origin: string } | null>(null);
  const [year, setYear] = useState(YEARS[0]);
  const [tileInfo, setTileInfo] = useState<{
    period: string;
    activity: string;
    left: number;
    top: number;
  } | null>(null);
  const activityCard = useRef<HTMLElement>(null);
  const yearlyGrid = useRef<HTMLDivElement>(null);
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

  const beginMonthZoom = useCallback((target: HTMLElement) => {
    if (selectedMonth !== null || monthZoom !== null) return;
    const month = Number(target.dataset.month);
    const grid = yearlyGrid.current?.getBoundingClientRect();
    setTileInfo(null);

    if (!grid || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSelectedMonth(month);
      return;
    }

    const tile = target.getBoundingClientRect();
    const x = (tile.left + tile.width / 2 - grid.left) / grid.width * 100;
    const y = (tile.top + tile.height / 2 - grid.top) / grid.height * 100;
    setMonthZoom({ month, origin: `${x}% ${y}%` });
  }, [monthZoom, selectedMonth]);

  useEffect(() => {
    const card = activityCard.current;
    if (!card) return;

    function zoomIntoMonth(target: EventTarget | null) {
      if (!(target instanceof Element)) return;
      const monthTile = target.closest<HTMLElement>("[data-month]");
      if (!monthTile) return;

      beginMonthZoom(monthTile);
    }

    function handleWheel(event: WheelEvent) {
      // Chromium and Firefox report trackpad pinch as Ctrl+wheel.
      if (!event.ctrlKey) return;
      event.preventDefault();
      if (event.deltaY < 0) zoomIntoMonth(event.target);
    }

    function handleGesture(event: Event) {
      // Safari also exposes its own pinch events.
      event.preventDefault();
      if (event.type === "gesturechange" && "scale" in event &&
          typeof event.scale === "number" && event.scale > 1.02) {
        zoomIntoMonth(event.target);
      }
    }

    card.addEventListener("wheel", handleWheel, { passive: false });
    card.addEventListener("gesturestart", handleGesture, { passive: false });
    card.addEventListener("gesturechange", handleGesture, { passive: false });
    return () => {
      card.removeEventListener("wheel", handleWheel);
      card.removeEventListener("gesturestart", handleGesture);
      card.removeEventListener("gesturechange", handleGesture);
    };
  }, [beginMonthZoom]);

  const months = useMemo(() => getActivityMonths(year), [year]);

  function renderTile(key: string, period: string, count: number, intensity: number, month?: number, day?: number) {
    const activity = `${count} ${count === 1 ? "activity" : "activities"}`;

    return (
      <button
        key={key}
        type="button"
        data-month={month}
        aria-label={`${period}: ${activity}`}
        onPointerEnter={(event) => showTileInfo(event.currentTarget, period, activity)}
        onPointerLeave={() => setTileInfo(null)}
        onFocus={(event) => showTileInfo(event.currentTarget, period, activity)}
        onBlur={() => setTileInfo(null)}
        onClick={(event) => showTileInfo(event.currentTarget, period, activity)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setTileInfo(null);
        }}
        style={{ animationDelay: `${month !== undefined ? month * 40 : ((day ?? 1) - 1) * 18}ms` }}
        className={`w-full cursor-pointer rounded-md text-xs font-medium inset-ring inset-ring-black/5 hover:inset-ring-black/35 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-950 motion-safe:animate-[heatmap-tile-in_460ms_ease-out_backwards] motion-safe:transition-[background-color] motion-safe:duration-500 motion-safe:ease-in-out ${day === undefined ? "aspect-square max-h-9 [@media(max-height:699px)]:h-5 [@media(max-height:699px)]:aspect-auto" : "h-full min-h-0 max-h-10 aspect-auto"} ${intensity >= 3 ? "text-white" : "text-neutral-900"} ${INTENSITY_CLASSES[intensity]}`}
      >
        {day}
      </button>
    );
  }

  const monthDays = selectedMonth === null ? null : months[selectedMonth];
  const monthName = monthDays ? MONTH_NAME.format(monthDays[0].date) : "";

  return (
    <section ref={activityCard} aria-labelledby="practice-activity" className="relative rounded-2xl border border-neutral-200 bg-white p-4 text-neutral-800 sm:p-5 [@media(max-height:699px)]:py-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
        <h2 id="practice-activity" className="text-2xl font-semibold tracking-tight text-neutral-900">
          Activity
        </h2>
        <details
          ref={yearPicker}
          className="group relative w-28 shrink-0"
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
            className="flex h-9 cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm hover:bg-emerald-50 [&::-webkit-details-marker]:hidden"
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

      <div className="relative pt-6 sm:pt-8 [@media(max-height:699px)]:pt-4">
        {/* Keep the yearly grid in the layout to reserve the same space in both views. */}
        <div
          inert={monthDays !== null}
          aria-hidden={monthDays !== null}
          onScroll={() => setTileInfo(null)}
          className={monthDays ? "invisible overflow-x-auto" : "overflow-x-auto"}
        >
          <div className="min-w-[27rem] overflow-clip">
            <div
              ref={yearlyGrid}
              role="group"
              aria-label={`Mock practice intensity for ${year}, grouped by month and day of the week.`}
              style={{ transformOrigin: monthZoom?.origin }}
              onAnimationEnd={(event) => {
                if (event.target !== event.currentTarget || event.animationName !== "heatmap-month-zoom" || !monthZoom) return;
                setSelectedMonth(monthZoom.month);
                setMonthZoom(null);
              }}
              className={`grid grid-cols-[2.25rem_repeat(12,minmax(0,1fr))] gap-1.5 sm:gap-2 ${monthZoom ? "pointer-events-none animate-[heatmap-month-zoom_300ms_ease-in_both]" : monthDays ? "" : "motion-safe:animate-[panel-enter_240ms_ease-out_both]"}`}
            >
              <span />
              {MONTH_LABELS.map((label, month) => (
                <button
                  key={label}
                  type="button"
                  data-month={month}
                  aria-label={`View ${MONTH_NAME.format(months[month][0].date)} ${year} daily activity`}
                  className="cursor-pointer rounded pb-1 text-center text-xs text-neutral-600 hover:text-emerald-700 hover:underline"
                  onClick={(event) => beginMonthZoom(event.currentTarget)}
                >
                  {label}
                </button>
              ))}
              {WEEKDAY_LABELS.flatMap((weekday, dayIndex) => [
                <span key={weekday} className="self-center text-right text-xs text-neutral-600">{weekday}</span>,
                ...months.map((days, month) => {
                  const weekdayDays = days.filter((day) => day.weekday === dayIndex);
                  const total = weekdayDays.reduce((sum, day) => sum + day.count, 0);
                  const intensity = total === 0 ? 0 : Math.max(1, Math.round(total / weekdayDays.length));
                  const period = `${weekday} · ${MONTH_LABELS[month]} ${year}`;
                  return renderTile(`${weekday}-${month}`, period, total, intensity, month);
                }),
              ])}
            </div>
          </div>
        </div>

        {monthDays && (
          <div key={monthName} className="absolute inset-0 flex flex-col gap-2 overflow-clip pt-2 motion-safe:animate-[panel-enter_240ms_ease-out_both]">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                onClick={() => {
                  setTileInfo(null);
                  setSelectedMonth(null);
                }}
              >
                <ArrowLeft aria-hidden="true" size={14} />
                Back to yearly
              </button>
              <h3 className="w-28 text-center text-base font-semibold text-neutral-900">{monthName}</h3>
            </div>
            <div role="group" aria-label={`Daily activity for ${monthName} ${year}`} className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[auto] auto-rows-fr gap-1.5 sm:gap-2">
              {WEEKDAY_LABELS.map((weekday) => (
                <span key={weekday} className="text-center text-xs text-neutral-600">{weekday}</span>
              ))}
              {Array.from({ length: monthDays[0].weekday }, (_, index) => <span key={index} aria-hidden="true" />)}
              {monthDays.map(({ date, count }, index) =>
                renderTile(date.toISOString(), `${monthName} ${index + 1}, ${year}`, count, count, undefined, index + 1),
              )}
            </div>
          </div>
        )}
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
