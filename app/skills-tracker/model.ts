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
export type LearningResource = { id: string; name: string; url: string };

export function resourceUrl(value: string) {
  const url = new URL(value.trim());
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Use an http or https link without embedded credentials.");
  if (url.href.length > 2048)
    throw new Error("Keep the link under 2,048 characters.");
  return url.href;
}

export type Skill = {
  id: string;
  name: string;
  slot: number;
  color: string;
  resources?: LearningResource[];
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
      // Older saves have no resources field; keep them readable without a reset.
      if (skill.resources !== undefined) {
        if (!Array.isArray(skill.resources)) throw Error();
        const resourceIds = new Set<string>();
        for (const resource of skill.resources) {
          if (
            !object(resource) ||
            !id(resource.id) ||
            resourceIds.has(resource.id) ||
            typeof resource.name !== "string" ||
            !resource.name.trim() ||
            resource.name.length > 100 ||
            typeof resource.url !== "string"
          )
            throw Error();
          resourceUrl(resource.url);
          resourceIds.add(resource.id);
        }
      }
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

export const PRACTICE_COLORS = [
  "#10b981",
  "#60a5fa",
  "#a78bfa",
  "#fbbf24",
  "#fb7185",
  "#22d3ee",
];

// Preserve card order from the saved skills, then append one available slot.
export function visibleSkillSlots(skills: Skill[]) {
  const slots = skills.map((skill) => skill.slot);
  const next = Array.from({ length: MAX_SKILLS }, (_, slot) => slot).find(
    (slot) => !slots.includes(slot),
  );
  return next === undefined ? slots : [...slots, next];
}

export function practiceBreakdown(
  skills: { id: string; name: string; slot: number; seconds: number }[],
) {
  const total = skills.reduce((sum, skill) => sum + skill.seconds, 0);
  let offset = 0;
  return skills
    .filter((skill) => skill.seconds > 0)
    .map((skill) => {
      const percent = (skill.seconds / total) * 100;
      const segment = {
        ...skill,
        color: PRACTICE_COLORS[skill.slot],
        percent,
        offset,
      };
      offset += percent;
      return segment;
    });
}

export type ActivityView = "weeks" | "months" | "years";
export function activityHistory(
  skills: Skill[],
  sessions: LearningSession[],
  today: string,
) {
  const dates = [
    ...skills.map((skill) => localDay(new Date(skill.createdAt))),
    ...sessions.map((session) => session.activityDate),
  ]
    .filter((day) => validDay(day) && day <= today)
    .sort();
  const first = dates[0] ?? today;
  const months =
    (Number(today.slice(0, 4)) - Number(first.slice(0, 4))) * 12 +
    Number(today.slice(5, 7)) -
    Number(first.slice(5, 7));
  const views: ActivityView[] = ["weeks"];
  if (months >= 1) views.push("months");
  if (months >= 12) views.push("years");
  return { first, views };
}
export function activityTimeline(
  skills: Skill[],
  sessions: LearningSession[],
  today: string,
  view: ActivityView,
  offset = 0,
) {
  const { first } = activityHistory(skills, sessions, today);
  const monthIndex = (day: string) =>
    Number(day.slice(0, 4)) * 12 + Number(day.slice(5, 7)) - 1;
  const minOffset =
    view === "years"
      ? Number(first.slice(0, 4)) - Number(today.slice(0, 4))
      : monthIndex(first) - monthIndex(today);
  const safeOffset = Math.min(0, Math.max(minOffset, offset));
  if (view === "weeks") {
    const weekly = weeklyActivity(sessions, today, safeOffset);
    return { ...weekly, buckets: weekly.weeks, minOffset, offset: safeOffset };
  }
  const anchor = new Date(today + "T12:00:00Z");
  anchor.setUTCDate(1);
  if (view === "years") {
    anchor.setUTCMonth(0);
    anchor.setUTCFullYear(anchor.getUTCFullYear() + safeOffset);
  } else anchor.setUTCMonth(anchor.getUTCMonth() + safeOffset);
  const from = new Date(anchor);
  if (view === "years")
    from.setUTCFullYear(
      Math.max(Number(first.slice(0, 4)), anchor.getUTCFullYear() - 11),
    );
  else
    from.setUTCMonth(
      from.getUTCMonth() -
        Math.min(
          11,
          monthIndex(anchor.toISOString().slice(0, 10)) - monthIndex(first),
        ),
    );
  const buckets: {
    start: string;
    end: string;
    seconds: number;
    count: number;
    activeDays: number;
  }[] = [];
  const cursor = new Date(from);
  while (cursor <= anchor) {
    const start = cursor.toISOString().slice(0, 10);
    const next = new Date(cursor);
    if (view === "years") next.setUTCFullYear(next.getUTCFullYear() + 1);
    else next.setUTCMonth(next.getUTCMonth() + 1);
    const end = shiftDay(next.toISOString().slice(0, 10), -1);
    const entries = sessions.filter(
      (session) =>
        session.activityDate >= start &&
        session.activityDate <= end &&
        session.activityDate <= today,
    );
    buckets.push({
      start,
      end,
      seconds: entries.reduce(
        (sum, session) => sum + session.durationSeconds,
        0,
      ),
      count: entries.length,
      activeDays: new Set(entries.map((session) => session.activityDate)).size,
    });
    cursor.setTime(next.getTime());
  }
  return {
    start: buckets[0].start,
    end: buckets[buckets.length - 1].end,
    buckets,
    minOffset,
    offset: safeOffset,
  };
}
