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

export async function loadAccountBoard(database: BoardDatabase, storage: GuestStorage) {
  const existing = await database.read();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return { state: parseBoard(existing.data.board), revision: existing.data.revision };

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
    return { state: parseBoard(latest.data.board), revision: latest.data.revision };
  }
  if (created.data === null) throw new Error("The database did not confirm your board was saved. Please retry.");

  // The database has acknowledged the complete board. Preserve any newer guest
  // edits from another tab, and keep the source intact on all save failures.
  try {
    if (guestRaw !== null && storage.getItem(GUEST_KEY) === guestRaw) storage.removeItem(GUEST_KEY);
  } catch { /* A retained local copy must not hide a successful database save. */ }
  return { state, revision: created.data };
}
