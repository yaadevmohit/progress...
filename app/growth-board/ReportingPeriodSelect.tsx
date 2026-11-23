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
            aria-pressed={period === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p
        className={styles.reportingDates}
        aria-live="polite"
        aria-atomic="true"
      >
        <strong>{range.label}</strong> · {reportingDate(range.start)} –{" "}
        {reportingDate(range.end)}
      </p>
    </div>
  );
}
