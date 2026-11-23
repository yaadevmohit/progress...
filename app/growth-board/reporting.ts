import { shiftDay, type PracticeEntry, type TrackerState } from "./model";

export type DashboardPeriod = "weekly" | "monthly" | "annual";
export type ReportingRange = { start: string; end: string; label: string };
export const DASHBOARD_PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
];
export function reportingRange(
  today: string,
  period: DashboardPeriod,
): ReportingRange {
  const days = period === "weekly" ? 7 : period === "monthly" ? 30 : 365;
  return {
    start: shiftDay(today, 1 - days),
    end: today,
    label: `Last ${days} days`,
  };
}
export function inReportingRange<T extends PracticeEntry>(
  entries: T[],
  range: ReportingRange,
): T[] {
  return entries.filter(
    (entry) =>
      entry.activityDate >= range.start && entry.activityDate <= range.end,
  );
}
// A read-only projection: source records and lifetime streak history stay intact.
export function reportingState(
  state: TrackerState,
  range: ReportingRange,
): TrackerState {
  return {
    ...state,
    sessions: inReportingRange(state.sessions, range),
    retainedPractice: inReportingRange(state.retainedPractice ?? [], range),
  };
}
export function reportingTimeline(
  entries: PracticeEntry[],
  range: ReportingRange,
  period: DashboardPeriod,
) {
  const buckets: {
    start: string;
    end: string;
    seconds: number;
    count: number;
    activeDays: number;
  }[] = [];
  const visible = inReportingRange(entries, range);
  let cursor = range.start;
  while (cursor <= range.end) {
    let last: string;
    if (period === "annual") {
      const date = new Date(cursor + "T12:00:00Z");
      last = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12),
      )
        .toISOString()
        .slice(0, 10);
    } else last = shiftDay(cursor, period === "monthly" ? 6 : 0);
    const end = last > range.end ? range.end : last;
    const items = visible.filter(
      (entry) => entry.activityDate >= cursor && entry.activityDate <= end,
    );
    buckets.push({
      start: cursor,
      end,
      seconds: items.reduce((sum, entry) => sum + entry.durationSeconds, 0),
      count: items.length,
      activeDays: new Set(items.map((entry) => entry.activityDate)).size,
    });
    cursor = shiftDay(end, 1);
  }
  return buckets;
}
export function reportingDate(day: string) {
  return new Date(day + "T12:00:00Z").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
