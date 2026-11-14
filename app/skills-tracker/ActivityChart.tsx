"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  activityHistory,
  activityTimeline,
  durationLabel,
  type ActivityView,
  type LearningSession,
  type Skill,
} from "./model";
import styles from "./tracker.module.css";
const COLORS = ["#e4d9a8", "#f7bc65", "#ed8c48", "#d95a3c", "#a9322e"];
function dateText(day: string, options: Intl.DateTimeFormatOptions) {
  return new Date(day + "T12:00:00Z").toLocaleDateString(undefined, {
    ...options,
    timeZone: "UTC",
  });
}
export default function ActivityChart({
  skills,
  sessions,
  today,
}: {
  skills: Skill[];
  sessions: LearningSession[];
  today: string;
}) {
  const [selection, setSelection] = useState<{
    view: ActivityView;
    offset: number;
  }>({ view: "weeks", offset: 0 });
  const { views } = activityHistory(skills, sessions, today);
  const view = views.includes(selection.view) ? selection.view : "weeks";
  const { start, end, buckets, minOffset, offset } = activityTimeline(
    skills,
    sessions,
    today,
    view,
    selection.offset,
  );
  const max = Math.max(...buckets.map((bucket) => bucket.seconds), 1);
  const title =
    view === "weeks"
      ? start.slice(0, 7) === end.slice(0, 7)
        ? dateText(start, { month: "long", year: "numeric" })
        : `${dateText(start, { month: "short", ...(start.slice(0, 4) !== end.slice(0, 4) ? { year: "numeric" } : {}) })} – ${dateText(end, { month: "short", year: "numeric" })}`
      : start.slice(0, 4) === end.slice(0, 4)
        ? start.slice(0, 4)
        : `${start.slice(0, 4)} – ${end.slice(0, 4)}`;
  function changeView(next: ActivityView) {
    const yearDifference = Number(end.slice(0, 4)) - Number(today.slice(0, 4));
    const monthDifference =
      yearDifference * 12 + Number(end.slice(5, 7)) - Number(today.slice(5, 7));
    setSelection({
      view: next,
      offset: Math.min(0, next === "years" ? yearDifference : monthDifference),
    });
  }
  function zoomTo(day: string) {
    if (view === "months")
      setSelection({
        view: "weeks",
        offset:
          (Number(day.slice(0, 4)) - Number(today.slice(0, 4))) * 12 +
          Number(day.slice(5, 7)) -
          Number(today.slice(5, 7)),
      });
    if (view === "years") {
      const yearDifference =
        Number(day.slice(0, 4)) - Number(today.slice(0, 4));
      setSelection({
        view: "months",
        offset:
          yearDifference === 0
            ? 0
            : yearDifference * 12 + 12 - Number(today.slice(5, 7)),
      });
    }
  }
  return (
    <section
      className={`${styles.panel} ${styles.activity}`}
      aria-labelledby="activity-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="activity-title" className="text-xl font-bold">
            Activity
          </h2>
          <p
            className="mt-1 text-xs font-semibold text-[var(--tracker-muted)]"
            aria-live="polite"
          >
            {title}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {views.length > 1 && (
            <div className={styles.activityViews} aria-label="Activity scale">
              {views.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={`Show ${option === "weeks" ? "weekly" : option === "months" ? "monthly" : "annual"} activity`}
                  aria-pressed={view === option}
                  onClick={() => changeView(option)}
                >
                  {option === "weeks"
                    ? "Weeks"
                    : option === "months"
                      ? "Months"
                      : "Years"}
                </button>
              ))}
            </div>
          )}
          {minOffset < 0 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={`Previous ${view === "years" ? "year" : "month"}`}
                disabled={offset <= minOffset}
                onClick={() => setSelection({ view, offset: offset - 1 })}
                className={styles.icon}
              >
                <ArrowLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setSelection({ view, offset: 0 })}
                className="rounded-lg px-2 py-2 text-xs font-bold text-[var(--tracker-ink)] hover:bg-[var(--tracker-hover)]"
              >
                Today
              </button>
              <button
                type="button"
                aria-label={`Next ${view === "years" ? "year" : "month"}`}
                disabled={offset === 0}
                onClick={() => setSelection({ view, offset: offset + 1 })}
                className={styles.icon}
              >
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
      <div
        className={`${styles.weeks} ${styles.activityZoom}`}
        key={`${view}-${start}-${end}-${sessions.length}`}
        style={{
          gridTemplateColumns: `repeat(${buckets.length},minmax(0,1fr))`,
        }}
      >
        {buckets.map((bucket, index) => {
          const level = bucket.seconds
            ? Math.max(1, Math.ceil((bucket.seconds / max) * 4))
            : 0;
          const period =
            view === "years"
              ? bucket.start.slice(0, 4)
              : view === "months"
                ? dateText(bucket.start, { month: "long", year: "numeric" })
                : `${dateText(bucket.start, { month: "short", day: "numeric", year: "numeric" })} – ${dateText(bucket.end, { month: "short", day: "numeric" })}`;
          const description = `${period}: ${bucket.count} ${bucket.count === 1 ? "session" : "sessions"}, ${durationLabel(bucket.seconds)}, ${bucket.activeDays} active ${bucket.activeDays === 1 ? "day" : "days"}`;
          return (
            <div key={bucket.start} className={styles.week}>
              <button
                type="button"
                className={styles.tile}
                aria-label={`${description}${view !== "weeks" ? ". Zoom in" : ""}`}
                style={{ backgroundColor: COLORS[level] }}
                onClick={
                  view === "weeks" ? undefined : () => zoomTo(bucket.start)
                }
              >
                <span role="tooltip" className={styles.tooltip}>
                  {description}
                </span>
              </button>
              <span className="mt-2 block text-center text-[10px] text-[var(--tracker-muted)]">
                {view === "years"
                  ? bucket.start.slice(0, 4)
                  : view === "months"
                    ? dateText(bucket.start, { month: "short" })
                    : dateText(bucket.start, {
                        day: "numeric",
                        ...(index === 0 ||
                        buckets[index - 1].start.slice(0, 7) !==
                          bucket.start.slice(0, 7)
                          ? { month: "short" }
                          : {}),
                      })}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-auto flex justify-end gap-1.5 text-[11px] font-semibold text-[var(--tracker-muted)]">
        <span className="mr-1">Less</span>
        {COLORS.map((color) => (
          <span
            key={color}
            aria-hidden="true"
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: color }}
          />
        ))}
        <span className="ml-1">More</span>
      </div>
    </section>
  );
}
