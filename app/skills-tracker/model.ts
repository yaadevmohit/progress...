export const MAX_SKILLS = 6;
export const MAX_MINUTES = 1440;
export const REMINDER_INTERVAL = 48 * 60 * 60 * 1000;
export const COLORS = [
  "#059669",
  "#0d9488",
  "#15803d",
  "#22a06b",
  "#0f766e",
  "#65a30d",
];
export type Skill = {
  id: string;
  name: string;
  slot: number;
  color: string;
  createdAt: string;
};
export type LearningSession = {
  id: string;
  skillId: string;
  durationSeconds: number;
  activityDate: string;
  notes: string;
  source: "recorded" | "timer";
  createdAt: string;
  timeZone: string;
};
export type ActiveTimer = {
  id: string;
  skillId: string;
  minutes: number;
  notes: string;
  startedAt: number;
  endsAt: number;
  timeZone: string;
};
export type TrackerState = {
  version: 1;
  skills: Skill[];
  sessions: LearningSession[];
  activeTimer: ActiveTimer | null;
  reminderDismissedAt: number | null;
};
export const EMPTY_STATE: TrackerState = {
  version: 1,
  skills: [],
  sessions: [],
  activeTimer: null,
  reminderDismissedAt: null,
};
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function validDay(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value + "T12:00:00Z")) &&
    new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value
  );
}
export function shiftDay(day: string, amount: number) {
  const date = new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function currentStreak(sessions: LearningSession[], today: string) {
  const days = new Set(
    sessions
      .filter((s) => s.durationSeconds > 0 && s.activityDate <= today)
      .map((s) => s.activityDate),
  );
  let cursor = days.has(today) ? today : shiftDay(today, -1),
    streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}
export function skillStats(state: TrackerState, today: string) {
  return state.skills.map((skill) => {
    const sessions = state.sessions.filter((s) => s.skillId === skill.id);
    return {
      ...skill,
      seconds: sessions.reduce((sum, s) => sum + s.durationSeconds, 0),
      streak: currentStreak(sessions, today),
      lastSession: [...sessions].sort(
        (a, b) =>
          b.activityDate.localeCompare(a.activityDate) ||
          b.createdAt.localeCompare(a.createdAt),
      )[0],
    };
  });
}
export function mostPractised(state: TrackerState, today: string) {
  return (
    skillStats(state, today)
      .filter((s) => s.seconds > 0)
      .sort(
        (a, b) =>
          b.seconds - a.seconds ||
          a.createdAt.localeCompare(b.createdAt) ||
          a.slot - b.slot,
      )[0] ?? null
  );
}
export function durationLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  if (!minutes) return seconds > 0 ? "<1m" : "0h";
  return minutes < 60
    ? `${minutes}m`
    : `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`;
}
export function weeklyActivity(
  sessions: LearningSession[],
  today: string,
  monthOffset = 0,
) {
  const anchor = new Date(today + "T12:00:00Z");
  anchor.setUTCDate(1);
  anchor.setUTCMonth(anchor.getUTCMonth() + monthOffset);
  const end = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0, 12),
  )
    .toISOString()
    .slice(0, 10);
  const startDate = new Date(anchor);
  if (sessions.length) startDate.setUTCMonth(startDate.getUTCMonth() - 2);
  const start = startDate.toISOString().slice(0, 10);
  const weeks: {
    start: string;
    end: string;
    seconds: number;
    count: number;
    activeDays: number;
  }[] = [];
  let cursor = start;
  while (cursor <= end) {
    const weekday = (new Date(cursor + "T12:00:00Z").getUTCDay() + 6) % 7;
    const proposed = shiftDay(cursor, 6 - weekday);
    const last = proposed > end ? end : proposed;
    const inWeek = sessions.filter(
      (s) =>
        s.activityDate >= cursor &&
        s.activityDate <= last &&
        s.activityDate <= today,
    );
    weeks.push({
      start: cursor,
      end: last,
      seconds: inWeek.reduce((sum, s) => sum + s.durationSeconds, 0),
      count: inWeek.length,
      activeDays: new Set(inWeek.map((s) => s.activityDate)).size,
    });
    cursor = shiftDay(last, 1);
  }
  return { start, end, weeks };
}
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function id(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 80;
}
function iso(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}
export function decodeTracker(raw: string): {
  state: TrackerState;
  error: string | null;
} {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !object(value) ||
      value.version !== 1 ||
      !Array.isArray(value.skills) ||
      !Array.isArray(value.sessions) ||
      value.skills.length > MAX_SKILLS
    )
      throw Error();
    const ids = new Set<string>(),
      names = new Set<string>(),
      slots = new Set<number>();
    for (const skill of value.skills) {
      if (
        !object(skill) ||
        !id(skill.id) ||
        typeof skill.name !== "string" ||
        !skill.name.trim() ||
        skill.name.length > 60 ||
        typeof skill.slot !== "number" ||
        !Number.isInteger(skill.slot) ||
        skill.slot < 0 ||
        skill.slot >= MAX_SKILLS ||
        typeof skill.color !== "string" ||
        !/^#[0-9a-fA-F]{6}$/.test(skill.color) ||
        !iso(skill.createdAt)
      )
        throw Error();
      const name = skill.name.trim().toLowerCase();
      if (ids.has(skill.id) || names.has(name) || slots.has(skill.slot))
        throw Error();
      ids.add(skill.id);
      names.add(name);
      slots.add(skill.slot);
    }
    const sessionIds = new Set<string>();
    for (const session of value.sessions) {
      if (
        !object(session) ||
        !id(session.id) ||
        sessionIds.has(session.id) ||
        !id(session.skillId) ||
        !ids.has(session.skillId) ||
        typeof session.durationSeconds !== "number" ||
        !Number.isInteger(session.durationSeconds) ||
        session.durationSeconds < 60 ||
        session.durationSeconds > MAX_MINUTES * 60 ||
        !validDay(session.activityDate) ||
        typeof session.notes !== "string" ||
        session.notes.length > 2000 ||
        !["recorded", "timer"].includes(String(session.source)) ||
        !iso(session.createdAt) ||
        typeof session.timeZone !== "string" ||
        session.timeZone.length > 100
      )
        throw Error();
      sessionIds.add(session.id);
    }
    const timer = value.activeTimer;
    if (timer !== null) {
      if (
        !object(timer) ||
        !id(timer.id) ||
        !id(timer.skillId) ||
        !ids.has(timer.skillId) ||
        typeof timer.minutes !== "number" ||
        !Number.isInteger(timer.minutes) ||
        timer.minutes < 1 ||
        timer.minutes > MAX_MINUTES ||
        typeof timer.startedAt !== "number" ||
        !Number.isFinite(timer.startedAt) ||
        typeof timer.endsAt !== "number" ||
        timer.endsAt !== timer.startedAt + timer.minutes * 60000 ||
        typeof timer.notes !== "string" ||
        timer.notes.length > 2000 ||
        typeof timer.timeZone !== "string"
      )
        throw Error();
    }
    if (
      value.reminderDismissedAt !== null &&
      (typeof value.reminderDismissedAt !== "number" ||
        !Number.isFinite(value.reminderDismissedAt) ||
        value.reminderDismissedAt < 0)
    )
      throw Error();
    return { state: value as TrackerState, error: null };
  } catch {
    return {
      state: EMPTY_STATE,
      error:
        "This browser’s saved tracker data couldn’t be read. It has not been overwritten. Export a backup before making changes.",
    };
  }
}
