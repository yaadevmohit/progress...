import { decodeTracker, EMPTY_STATE, type TrackerState } from "./model";

// Keep this migration independent of React so retries and races can be tested.
type Result<T> = { data: T; error: { code?: string; message: string } | null };
type SavedBoard = { board: unknown; revision: number };
export type BoardDatabase = {
  read: () => Promise<Result<SavedBoard | null>>;
  create: (state: TrackerState) => Promise<Result<number | null>>;
};
type GuestStorage = Pick<Storage, "getItem" | "removeItem">;
const GUEST_KEY = "progress.skills-tracker.v1";

function parseBoard(value: unknown) {
  const parsed = decodeTracker(JSON.stringify(value));
  if (parsed.error) throw new Error(parsed.error);
  return parsed.state;
}

// JSONB may reorder object keys. Compare content rather than serialized key order.
function sameContent(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => sameContent(value, right[index]));
  }
  const a = left as Record<string, unknown>, b = right as Record<string, unknown>;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => Object.hasOwn(b, key) && sameContent(a[key], b[key]));
}
function alreadySaved(guest: TrackerState, saved: TrackerState) {
  const skills = new Map(saved.skills.map((skill) => [skill.id, skill]));
  const sessions = new Map(saved.sessions.map((session) => [session.id, session]));
  return guest.skills.every((skill) => {
    const online = skills.get(skill.id);
    return !!online && sameContent({ ...skill, resources: skill.resources ?? [] }, { ...online, resources: online.resources ?? [] });
  }) && guest.sessions.every((session) => sameContent(session, sessions.get(session.id)))
    && (!guest.activeTimer || sameContent(guest.activeTimer, saved.activeTimer));
}
function clearSavedGuest(storage: GuestStorage, saved: TrackerState) {
  try {
    const raw = storage.getItem(GUEST_KEY);
    if (raw === null) return;
    const parsed = decodeTracker(raw);
    // Loading another account must never erase unrelated or unsaved guest work.
    if (!parsed.error && alreadySaved(parsed.state, saved) && storage.getItem(GUEST_KEY) === raw) storage.removeItem(GUEST_KEY);
  } catch { /* Browser cleanup must not hide a successfully loaded account. */ }
}
function loadedBoard(data: SavedBoard, storage: GuestStorage) {
  const state = parseBoard(data.board);
  clearSavedGuest(storage, state);
  return { state, revision: data.revision };
}

export async function loadAccountBoard(database: BoardDatabase, storage: GuestStorage) {
  const existing = await database.read();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return loadedBoard(existing.data, storage);

  // Wait for a verified session before transferring anything. Read the latest
  // guest board, including practice done while email confirmation was pending.
  const guestRaw = storage.getItem(GUEST_KEY);
  const state = parseBoard(guestRaw === null ? EMPTY_STATE : JSON.parse(guestRaw));
  const created = await database.create(state);
  if (created.error) {
    if (created.error.code !== "40001") throw new Error(created.error.message);
    // Another tab/device initialized the account first. Never overwrite it.
    const latest = await database.read();
    if (latest.error) throw new Error(latest.error.message);
    if (!latest.data) throw new Error("Your board changed. Please retry loading it.");
    return loadedBoard(latest.data, storage);
  }
  if (created.data === null) throw new Error("The database did not confirm your board was saved. Please retry.");

  // The database has acknowledged the complete board. Preserve any newer guest
  // edits from another tab, and keep the source intact on all save failures.
  try {
    if (guestRaw !== null && storage.getItem(GUEST_KEY) === guestRaw) storage.removeItem(GUEST_KEY);
  } catch { /* A retained local copy must not hide a successful database save. */ }
  return { state, revision: created.data };
}
