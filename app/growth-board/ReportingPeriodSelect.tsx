"use client";
import {
  DASHBOARD_PERIODS,
  reportingDate,
  type DashboardPeriod,
  type ReportingRange,
} from "./reporting";
import styles from "./tracker.module.css";
export default function ReportingPeriodSelect({
  period,
  range,
  onChange,
}: {
  period: DashboardPeriod;
  range: ReportingRange;
  onChange: (period: DashboardPeriod) => void;
}) {
  return (
    <div className={styles.reportingControl}>
      <div
        className={styles.activityViews}
        role="group"
        aria-label="Dashboard period"
      >
        {DASHBOARD_PERIODS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={period === option.value}
            onClick={() => onChange(option.value)}
          >
            <span className={styles.periodLong} aria-hidden="true">
              {option.label}
            </span>
            <span className={styles.periodShort} aria-hidden="true">
              {option.value === "weekly"
                ? "7d"
                : option.value === "monthly"
                  ? "m"
                  : "y"}
            </span>
          </button>
        ))}
      </div>
      <p
        className={styles.reportingDates}
        aria-live="polite"
        aria-atomic="true"
      >
        <strong>{range.label}</strong>
        <span className={styles.periodLong}>
          {" "}
          · {reportingDate(range.start)} – {reportingDate(range.end)}
        </span>
      </p>
    </div>
  );
}
