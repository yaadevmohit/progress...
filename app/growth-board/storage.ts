"use client";
import { useMemo, useSyncExternalStore } from "react";
import {
  COLORS,
  timerPhases,
  validatePomodoro,
  type PomodoroConfig,
  activeSkills,
  rootSkills,
  subtreeIds,
  isActiveSkill,
  decodeTracker,
  EMPTY_STATE,
  localDay,
  resourceUrl,
  MAX_MINUTES,
  MAX_SKILLS,
  validDay,
  type ActiveTimer,
  type LearningSession,
  type Skill,
  type TrackerState,
} from "./model";
export const GUEST_STORAGE_KEY = "progress.skills-tracker.v1";
export let STORAGE_KEY = GUEST_STORAGE_KEY;
type Persistence = { save: (state: TrackerState) => Promise<void> };
let persistence: Persistence | null = null;
let blocked = false;
export function configureTracker(userId: string | null, adapter: Persistence | null = null, loading = false) {
  STORAGE_KEY = userId ? `${GUEST_STORAGE_KEY}.user.${userId}` : GUEST_STORAGE_KEY;
  persistence = adapter;
  blocked = loading;
  window.dispatchEvent(new Event(CHANGE));
}
export function replaceTracker(state: TrackerState) {
  const raw = JSON.stringify(state);
  const parsed = decodeTracker(raw);
  if (parsed.error) throw new Error(parsed.error);
  localStorage.setItem(STORAGE_KEY, raw);
  window.dispatchEvent(new Event(CHANGE));
}
export async function importGuestTracker() {
  const parsed = decodeTracker(localStorage.getItem(GUEST_STORAGE_KEY) ?? EMPTY);
  if (parsed.error) throw new Error(parsed.error);
  return mutate((state) => {
    if (state.skills.length || state.sessions.length || state.activeTimer || state.retainedPractice?.length)
      throw new Error("Browser progress can only be imported into an empty account board.");
    return { state: parsed.state, result: null };
  });
}
const CHANGE = "skills-tracker:changed";
const EMPTY = JSON.stringify(EMPTY_STATE);
function snapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? EMPTY;
  } catch {
    return EMPTY;
  }
}
function subscribe(listener: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener();
  };
  window.addEventListener(CHANGE, listener);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(CHANGE, listener);
    window.removeEventListener("storage", storage);
  };
}
const noopSubscribe = () => () => {};
export function useTracker() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const ready = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const decoded = useMemo(() => decodeTracker(raw), [raw]);
  return { ...decoded, ready };
}
async function mutate<T>(
  change: (state: TrackerState) => { state: TrackerState; result: T },
): Promise<T> {
  const key = STORAGE_KEY;
  const adapter = persistence;
  const update = async () => {
    if (blocked || key !== STORAGE_KEY || adapter !== persistence) throw new Error("Your board is loading or your account changed. Please try again.");
    const raw = localStorage.getItem(STORAGE_KEY) ?? EMPTY;
    const parsed = decodeTracker(raw);
    if (parsed.error) throw new Error(parsed.error);
    const next = change(parsed.state);
    if (!decodeTracker(JSON.stringify(next.state)).error) {
      if (adapter) await adapter.save(next.state);
      if (key !== STORAGE_KEY || adapter !== persistence) throw new Error("Your account changed. Reload your board before continuing.");
      localStorage.setItem(key, JSON.stringify(next.state));
      window.dispatchEvent(new Event(CHANGE));
      return next.result;
    }
    throw new Error("This change could not be saved safely.");
  };
  try {
    return navigator.locks
      ? await navigator.locks.request(STORAGE_KEY, update)
      : await update();
  } catch (error) {
    if (error instanceof Error && !(error instanceof DOMException)) throw error;
    throw new Error(
      "Couldn’t save in this browser. Check that local storage is allowed and has space, then try again.",
    );
  }
}
export async function addSkill(
  name: string,
  requestedSlot?: number,
  description = "",
  parentId: string | null = null,
): Promise<Skill> {
  return mutate((state) => {
    const clean = name.trim();
    if (!clean || clean.length > 60)
      throw new Error("Enter a skill name between 1 and 60 characters.");
    if (description.trim().length > 2000)
      throw new Error("Keep the description under 2,000 characters.");
    const active = activeSkills(state.skills).filter(
      (s) => (s.parentId ?? null) === parentId,
    );
    const parent = state.skills.find((s) => s.id === parentId);
    if (parentId && (!parent || !isActiveSkill(parent)))
      throw new Error("Choose an active parent skill.");
    if (!parentId && active.length >= MAX_SKILLS)
      throw new Error("You can learn up to six skills at a time.");
    if (active.some((s) => s.name.toLowerCase() === clean.toLowerCase()))
      throw new Error("That skill is already on your dashboard.");
    const free = Array.from({ length: MAX_SKILLS }, (_, i) => i).filter(
      (i) => !active.some((s) => s.slot === i),
    );
    const slot = parent
      ? (parent.slot + 1 + active.length) % MAX_SKILLS
      : requestedSlot !== undefined && free.includes(requestedSlot)
        ? requestedSlot
        : free[0];
    const skill = {
      id: crypto.randomUUID(),
      name: clean,
      parentId,
      slot,
      color: COLORS[slot],
      description: description.trim(),
      status: "active" as const,
      createdAt: new Date().toISOString(),
    };
    return {
      state: { ...state, skills: [...state.skills, skill] },
      result: skill,
    };
  });
}
function ensureSession(
  state: TrackerState,
  skillId: string,
  minutes: number,
  date: string,
  notes: string,
) {
  if (!state.skills.some((s) => s.id === skillId && isActiveSkill(s)))
    throw new Error("Choose a skill that’s on your dashboard.");
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_MINUTES)
    throw new Error(
      `Choose a duration from 1 to ${MAX_MINUTES} whole minutes.`,
    );
  if (!validDay(date) || date > localDay())
    throw new Error("Choose today or a past date.");
  if (notes.trim().length > 2000)
    throw new Error("Keep the description under 2,000 characters.");
}
export async function logSession(
  skillId: string,
  minutes: number,
  date: string,
  notes: string,
) {
  return mutate((state) => {
    ensureSession(state, skillId, minutes, date, notes);
    const session: LearningSession = {
      id: crypto.randomUUID(),
      skillId,
      durationSeconds: minutes * 60,
      activityDate: date,
      notes: notes.trim(),
      source: "recorded",
      createdAt: new Date().toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    return {
      state: { ...state, sessions: [session, ...state.sessions] },
      result: session,
    };
  });
}
export async function startTimer(
  skillId: string,
  minutes: number,
  notes: string,
  pomodoro?: PomodoroConfig,
  soundOwner?: "extension",
) {
  return mutate((state) => {
    ensureSession(state, skillId, minutes, localDay(), notes);
    if (state.activeTimer)
      throw new Error("Finish or cancel the current timer first.");
    if (pomodoro !== undefined) validatePomodoro(minutes, pomodoro);
    const startedAt = Date.now();
    const timer: ActiveTimer = {
      id: crypto.randomUUID(),
      skillId,
      minutes,
      notes: notes.trim(),
      startedAt,
      endsAt: startedAt + (minutes + (pomodoro ? pomodoro.breaks * pomodoro.breakMinutes : 0)) * 60000,
      ...(pomodoro ? { pomodoro } : {}),
      ...(soundOwner ? { soundOwner } : {}),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    return { state: { ...state, activeTimer: timer }, result: timer };
  });
}
export async function finishTimer(timerId: string, early = false) {
  return mutate((state) => {
    const timer = state.activeTimer;
    if (!timer || timer.id !== timerId) return { state, result: null };
    if (timer.pomodoro) return settlePomodoro(state, timer, Date.now(), early);
    const finishedAt = early
      ? Math.min(Date.now(), timer.endsAt)
      : timer.endsAt;
    if (!early && Date.now() < timer.endsAt)
      throw new Error("The timer has not finished yet.");
    const durationSeconds = Math.min(
      timer.minutes * 60,
      Math.floor((finishedAt - timer.startedAt) / 1000),
    );
    if (durationSeconds < 60)
      throw new Error(
        "Practise for at least one minute before saving an early finish.",
      );
    const session: LearningSession = {
      id: timer.id,
      skillId: timer.skillId,
      durationSeconds,
      activityDate: localDay(new Date(finishedAt)),
      notes: timer.notes,
      source: "timer",
      createdAt: new Date(finishedAt).toISOString(),
      timeZone: timer.timeZone,
    };
    return {
      state: {
        ...state,
        activeTimer: null,
        sessions: (state.deletedSessionIds ?? []).includes(timer.id) || state.sessions.some(
          (s) => s.id === timer.id,
        )
          ? state.sessions
          : [session, ...state.sessions],
      },
      result: session,
    };
  });
}
// Persist every completed focus block at its own boundary. Deterministic IDs
// make app/extension races and offline recovery safe, including deleted rows.
function settlePomodoro(state: TrackerState, timer: ActiveTimer, now: number, stop = false) {
  const ids = new Set([...state.sessions.map((s) => s.id), ...(state.deletedSessionIds ?? [])]);
  const added: LearningSession[] = [];
  for (const phase of timerPhases(timer)) {
    if (phase.kind !== "focus" || phase.endsAt > now || ids.has(phase.key)) continue;
    added.push({ id: phase.key, skillId: timer.skillId, durationSeconds: phase.durationSeconds,
      activityDate: localDay(new Date(phase.endsAt)), notes: timer.notes, source: "timer",
      createdAt: new Date(phase.endsAt).toISOString(), timeZone: timer.timeZone });
  }
  const done = now >= timer.endsAt;
  return { state: { ...state, sessions: [...added.reverse(), ...state.sessions],
    activeTimer: done || stop ? null : timer },
    result: done ? added[0] ?? null : null };
}
export async function cancelTimer(timerId: string) {
  return mutate((state) => {
    const timer = state.activeTimer;
    if (!timer || timer.id !== timerId) return { state, result: null };
    if (timer.pomodoro) return settlePomodoro(state, timer, Date.now(), true);
    return { state: { ...state, activeTimer: null }, result: null };
  });
}
export async function dismissReminder() {
  return mutate((state) => ({
    state: { ...state, reminderDismissedAt: Date.now() },
    result: null,
  }));
}
export function exportTracker() {
  const raw = localStorage.getItem(STORAGE_KEY) ?? EMPTY;
  const blob = new Blob([raw], { type: "application/json" }),
    url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = `growth-board-${localDay()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
let clock: number | null = null;
function subscribeClock(listener: () => void) {
  const tick = () => {
    clock = Date.now();
    listener();
  };
  tick();
  const timer = setInterval(tick, 1000);
  return () => clearInterval(timer);
}
export function useClock() {
  return useSyncExternalStore(
    subscribeClock,
    () => clock,
    () => null,
  );
}

export async function addResource(skillId: string, name: string, link: string) {
  return mutate((state) => {
    const skill = state.skills.find((item) => item.id === skillId);
    if (!skill || skill.status === "deleted")
      throw new Error("This skill is no longer available.");
    const clean = name.trim();
    if (!clean || clean.length > 100)
      throw new Error("Enter a resource name between 1 and 100 characters.");
    let url: string;
    try {
      url = resourceUrl(link);
    } catch {
      throw new Error(
        "Enter a valid http or https link, such as https://example.com.",
      );
    }
    if (skill.resources?.some((item) => item.url === url))
      throw new Error("This link is already saved for this skill.");
    const resource = { id: crypto.randomUUID(), name: clean, url };
    return {
      state: {
        ...state,
        skills: state.skills.map((item) =>
          item.id === skillId
            ? { ...item, resources: [...(item.resources ?? []), resource] }
            : item,
        ),
      },
      result: resource,
    };
  });
}
export async function removeResource(skillId: string, resourceId: string) {
  return mutate((state) => {
    if (
      state.skills.find((skill) => skill.id === skillId)?.status === "deleted"
    )
      throw new Error("Deleted skills cannot be edited.");
    return {
      state: {
        ...state,
        skills: state.skills.map((skill) =>
          skill.id === skillId
            ? {
                ...skill,
                resources: (skill.resources ?? []).filter(
                  (item) => item.id !== resourceId,
                ),
              }
            : skill,
        ),
      },
      result: null,
    };
  });
}

export async function updateSkill(
  skillId: string,
  name: string,
  description: string,
  resources: import("./model").LearningResource[],
) {
  return mutate((state) => {
    const skill = state.skills.find((s) => s.id === skillId);
    if (!skill || skill.status === "deleted")
      throw new Error("This skill cannot be edited.");
    const clean = name.trim();
    if (!clean || clean.length > 60)
      throw new Error("Enter a skill name between 1 and 60 characters.");
    if (description.trim().length > 2000)
      throw new Error("Keep the description under 2,000 characters.");
    if (
      isActiveSkill(skill) &&
      activeSkills(state.skills).some(
        (s) =>
          s.id !== skillId &&
          (s.parentId ?? null) === (skill.parentId ?? null) &&
          s.name.toLowerCase() === clean.toLowerCase(),
      )
    )
      throw new Error("That skill is already on your dashboard.");
    const links = new Set<string>(),
      ids = new Set<string>();
    const normalized = resources
      .filter((r) => r.name.trim() || r.url.trim())
      .map((resource) => {
        const label = resource.name.trim();
        if (!label || label.length > 100)
          throw new Error("Give each resource a name of up to 100 characters.");
        let url: string;
        try {
          url = resourceUrl(resource.url);
        } catch {
          throw new Error("Give each resource a valid http or https link.");
        }
        if (links.has(url) || ids.has(resource.id))
          throw new Error("Each resource needs a unique link.");
        links.add(url);
        ids.add(resource.id);
        return { ...resource, name: label, url };
      });
    return {
      state: {
        ...state,
        skills: state.skills.map((s) =>
          s.id === skillId
            ? {
                ...s,
                name: clean,
                description: description.trim(),
                resources: normalized,
              }
            : s,
        ),
      },
      result: null,
    };
  });
}
export async function moveSkill(skillId: string, parentId: string) {
  return mutate((state) => {
    const skill = state.skills.find((s) => s.id === skillId);
    const parent = state.skills.find((s) => s.id === parentId);
    if (!skill || !isActiveSkill(skill)) throw new Error("Choose an active skill to move.");
    if (!parent || !isActiveSkill(parent)) throw new Error("Choose an active parent skill.");
    if (subtreeIds(state.skills, skillId).has(parentId))
      throw new Error("A skill cannot be moved under itself or one of its subskills.");
    if (skill.parentId === parentId) return { state, result: null };
    const siblings = activeSkills(state.skills).filter((s) => s.parentId === parentId);
    if (siblings.some((s) => s.name.toLowerCase() === skill.name.toLowerCase()))
      throw new Error("This parent already has a subskill with that name. Rename the skill first.");
    const slot = (parent.slot + 1 + siblings.length) % MAX_SKILLS;
    return { state: { ...state, skills: state.skills.map((s) => s.id === skillId
      ? { ...s, parentId, slot, color: COLORS[slot] } : s) }, result: null };
  });
}
export async function deactivateSkill(
  skillId: string,
  status: "archived" | "deleted",
) {
  return mutate((state) => {
    const skill = state.skills.find((s) => s.id === skillId);
    if (!skill) throw new Error("Skill not found.");
    if (skill.status === "deleted")
      throw new Error("This skill has already been deleted.");
    const affected = subtreeIds(state.skills, skillId);
    if (state.activeTimer && affected.has(state.activeTimer.skillId))
      throw new Error("Finish or cancel the timer for this skill first.");
    if (status === "deleted") {
      const removedIds = state.sessions.filter((s) => affected.has(s.skillId)).map((s) => s.id);
      return { state: { ...state,
        skills: state.skills.filter((s) => !affected.has(s.id)),
        sessions: state.sessions.filter((s) => !affected.has(s.skillId)),
        retainedPractice: [],
        deletedSessionIds: [...new Set([...(state.deletedSessionIds ?? []), ...removedIds])],
      }, result: null };
    }
    return {
      state: {
        ...state,
        skills: state.skills.map((s) =>
          affected.has(s.id) && s.status !== "deleted"
            ? { ...s, status, deactivatedAt: new Date().toISOString() }
            : s,
        ),
      },
      result: null,
    };
  });
}
export async function restoreSkill(skillId: string) {
  return mutate((state) => {
    const skill = state.skills.find((s) => s.id === skillId);
    if (!skill || skill.status !== "archived")
      throw new Error("Only archived skills can be restored.");
    const parent = state.skills.find((s) => s.id === skill.parentId);
    if (skill.parentId && (!parent || !isActiveSkill(parent)))
      throw new Error("Restore the parent skill first.");
    const active = activeSkills(state.skills).filter(
      (s) => (s.parentId ?? null) === (skill.parentId ?? null),
    );
    if (!skill.parentId && rootSkills(active).length >= MAX_SKILLS)
      throw new Error("Make room in your six active skill slots first.");
    if (active.some((s) => s.name.toLowerCase() === skill.name.toLowerCase()))
      throw new Error(
        "A skill with this name is already active. Edit its name before restoring it.",
      );
    const slot =
      skill.parentId || !active.some((s) => s.slot === skill.slot)
        ? skill.slot
        : Array.from({ length: MAX_SKILLS }, (_, i) => i).find(
            (i) => !active.some((s) => s.slot === i),
          )!;
    return {
      state: {
        ...state,
        skills: state.skills.map((s) =>
          s.id === skillId
            ? {
                ...s,
                status: "active" as const,
                slot,
                color: COLORS[slot],
                deactivatedAt: undefined,
              }
            : s,
        ),
      },
      result: null,
    };
  });
}
export async function deleteSession(sessionId: string, allForSkill = false) {
  return mutate((state) => {
    const entry = state.sessions.find((s) => s.id === sessionId);
    if (!entry) return { state, result: 0 };
    const removed = state.sessions.filter((s) =>
      allForSkill ? s.skillId === entry.skillId : s.id === sessionId,
    );
    const ids = new Set(removed.map((s) => s.id));
    return {
      state: {
        ...state,
        sessions: state.sessions.filter((s) => !ids.has(s.id)),
        retainedPractice: [],
        deletedSessionIds: [...new Set([...(state.deletedSessionIds ?? []), ...ids])],
      },
      result: removed.length,
    };
  });
}
