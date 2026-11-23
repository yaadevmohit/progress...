"use client";
import { durationLabel, type PracticeEntry } from "./model";
import {
  reportingTimeline,
  reportingDate,
  type DashboardPeriod,
  type ReportingRange,
} from "./reporting";
import styles from "./tracker.module.css";
const COLORS = [
  "var(--tracker-chart-empty)",
  "var(--tracker-heat-1, #f7bc65)",
  "var(--tracker-heat-2, #ed8c48)",
  "var(--tracker-heat-3, #d95a3c)",
  "var(--tracker-heat-4, #a9322e)",
];
function dateText(day: string, options: Intl.DateTimeFormatOptions) {
  return new Date(day + "T12:00:00Z").toLocaleDateString(undefined, {
    ...options,
    timeZone: "UTC",
  });
}
export default function ActivityChart({
  sessions,
  period,
  range,
  skillName,
}: {
  sessions: PracticeEntry[];
  period: DashboardPeriod;
  range: ReportingRange;
  skillName?: string;
}) {
  const buckets = reportingTimeline(sessions, range, period);
  const max = Math.max(...buckets.map((bucket) => bucket.seconds), 1);
  return (
    <section
      className={`${styles.panel} ${styles.activity}`}
      aria-labelledby="activity-title"
      aria-label={`${range.label} activity`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="activity-title" className="text-xl font-bold">
            Activity
            {skillName && (
              <span
                className="ml-2 inline-block max-w-44 truncate align-middle text-xs font-bold text-[var(--tracker-muted)]"
                title={skillName}
              >
                {skillName}
              </span>
            )}
          </h2>
          <p
            className="mt-1 text-xs font-semibold text-[var(--tracker-muted)]"
            aria-live="polite"
          >
            {reportingDate(range.start)} – {reportingDate(range.end)}
          </p>
        </div>
      </div>
      <div
        className={`${styles.weeks} ${styles.activityZoom}`}
        key={`${period}-${range.start}-${range.end}-${skillName ?? "all"}-${sessions.length}`}
        style={{
          gridTemplateColumns: `repeat(${buckets.length},minmax(0,1fr))`,
        }}
      >
        {buckets.map((bucket) => {
          const level = bucket.seconds
            ? Math.max(1, Math.ceil((bucket.seconds / max) * 4))
            : 0;
          const bucketLabel =
            bucket.start === bucket.end
              ? reportingDate(bucket.start)
              : `${reportingDate(bucket.start)} – ${reportingDate(bucket.end)}`;
          const description = `${bucketLabel}: ${bucket.count} ${bucket.count === 1 ? "session" : "sessions"}, ${durationLabel(bucket.seconds)}, ${bucket.activeDays} active ${bucket.activeDays === 1 ? "day" : "days"}`;
          return (
            <div key={bucket.start} className={styles.week}>
              <button
                type="button"
                className={styles.tile}
                aria-label={description}
                style={{ backgroundColor: COLORS[level] }}
              >
                <span role="tooltip" className={styles.tooltip}>
                  {description}
                </span>
              </button>
              <span className="mt-2 block text-center text-[10px] text-[var(--tracker-muted)]">
                {dateText(
                  bucket.start,
                  period === "annual"
                    ? {
                        month: "short",
                        ...(bucket.start.slice(0, 7) ===
                          range.start.slice(0, 7) ||
                        bucket.start.slice(5, 7) === "01"
                          ? { year: "2-digit" }
                          : {}),
                      }
                    : period === "weekly"
                      ? { weekday: "short", day: "numeric" }
                      : { month: "short", day: "numeric" },
                )}
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
