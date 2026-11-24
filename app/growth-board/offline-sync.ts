import { decodeTracker, EMPTY_STATE, type TrackerState } from "./model";
import { mergeBoards, sameValue, type ConflictChoice } from "./offline-merge";
export type BoardSnapshot = { state: TrackerState; revision: number };
export type SyncStatus = { mode: "online" | "offline" | "syncing" | "pending" | "conflict"; pending: boolean; message: string };
export type SyncDatabase = { read: () => Promise<BoardSnapshot>; write: (state: TrackerState, revision: number) => Promise<number> };
type Queue = { version: 1; userId: string; base: TrackerState; current: TrackerState; revision: number; pending: boolean };
const PREFIX = "progress.skills-tracker.v1.user.";
const EPOCH = "progress.skills-tracker.account-cache-epoch";
export function offlineKey(userId: string) { return `${PREFIX}${userId}.offline`; }
export class DatabaseFailure extends Error {
  constructor(message: string, public code = "") { super(message); }
}
export function networkFailure(error: unknown) {
  return error instanceof TypeError || (error instanceof Error && /failed to fetch|fetch failed|network|load failed|timeout|timed out/i.test(error.message));
}
export class AccountSync {
  private current: TrackerState = EMPTY_STATE;
  private base: TrackerState = EMPTY_STATE;
  private revision = 0;
  private initialized = false;
  private epoch: string | null;
  constructor(private userId: string, private database: SyncDatabase, private storage: Storage,
    private online: () => boolean, private active: () => boolean, private status: (value: SyncStatus) => void) {
    this.epoch = storage.getItem(EPOCH);
  }
  private check() {
    if (!this.active() || this.epoch !== this.storage.getItem(EPOCH)) throw new Error("Your account changed. Sign in again before syncing this board.");
  }
  private queue(): Queue | null {
    const raw = this.storage.getItem(offlineKey(this.userId));
    if (!raw) return null;
    const value = JSON.parse(raw) as Queue;
    if (value.version !== 1 || value.userId !== this.userId || typeof value.pending !== "boolean") throw new Error("The offline save cannot be read safely. Keep your site data and retry.");
    const base = decodeTracker(JSON.stringify(value.base)), current = decodeTracker(JSON.stringify(value.current));
    if (base.error || current.error) throw new Error("Your offline save could not be read. Keep your site data so it can be recovered.");
    const revision = value.revision ?? 0;
    if (!Number.isSafeInteger(revision) || revision < 0) throw new Error("The offline revision cannot be read safely.");
    if (this.initialized && this.revision > revision) {
      // An idle tab can checkpoint an older acknowledged board. Rebase its
      // pending edits onto this tab's newer acknowledged data before displaying it.
      const merged = mergeBoards(base.state, current.state, this.current, "device").state;
      return { ...value, base: this.base, current: merged, revision: this.revision, pending: !sameValue(this.base, merged) };
    }
    return { ...value, base: base.state, current: current.state, revision };
  }
  private stash(base: TrackerState, current: TrackerState) {
    this.check();
    const pending = !sameValue(base, current);
    try {
      this.storage.setItem(offlineKey(this.userId), JSON.stringify({ version: 1, userId: this.userId, base, current, revision: this.revision, pending } satisfies Queue));
    } catch (error) {
      this.status({ mode: "pending", pending: false, message: "Offline storage is unavailable. This edit was not saved. Reconnect and try again." });
      throw error;
    }
    return pending;
  }
  private accept(snapshot: BoardSnapshot) {
    this.check();
    this.current = this.base = snapshot.state;
    this.revision = snapshot.revision;
    this.initialized = true;
    if (!this.online()) {
      this.stash(snapshot.state, snapshot.state);
      this.status({ mode: "offline", pending: false, message: "No internet connection. This board is available on this device while you are offline." });
      return snapshot.state;
    }
    this.storage.removeItem(offlineKey(this.userId));
    this.storage.removeItem(`${PREFIX}${this.userId}`); // Remove the previous always-on cache.
    this.status({ mode: "online", pending: false, message: "" });
    return snapshot.state;
  }
  async open(bootstrap: () => Promise<BoardSnapshot>) {
    const queue = this.queue();
    if (queue) {
      this.current = queue.current; this.base = queue.base; this.revision = queue.revision; this.initialized = true;
      return this.sync();
    }
    if (!this.online()) throw new Error("No offline copy is available for this account. Open your board online first, then keep it open to work offline.");
    return this.accept(await bootstrap());
  }
  checkpoint() {
    if (!this.initialized) return this.current;
    const queue = this.queue();
    this.base = queue?.base ?? this.base; this.current = queue?.current ?? this.current; this.revision = queue?.revision ?? this.revision;
    const pending = this.stash(this.base, this.current);
    this.status({ mode: "offline", pending, message: "No internet connection. Changes are saved on this device and will sync when you reconnect." });
    return this.current;
  }
  async save(next: TrackerState, previous: TrackerState) {
    this.check();
    const queue = this.queue();
    // A second tab may have queued a different edit while this tab was idle.
    const current = queue ? mergeBoards(previous, next, queue.current, "device").state : next;
    if (!this.online() || queue?.pending) {
      const base = queue?.base ?? this.base;
      this.revision = queue?.revision ?? this.revision;
      const pending = this.stash(base, current);
      this.current = current; this.base = base;
      if (this.online()) return this.sync();
      this.status({ mode: "offline", pending, message: "No internet connection. Your changes are saved on this device." });
      return current;
    }
    this.status({ mode: "syncing", pending: false, message: "Saving…" });
    try {
      const revision = await this.database.write(current, this.revision);
      return this.accept({ state: current, revision });
    } catch (error) {
      this.check();
      if (error instanceof DatabaseFailure && error.code === "40001") {
        this.stash(this.base, current); this.current = current;
        return this.sync();
      }
      if (!this.online() || networkFailure(error)) {
        this.stash(this.base, current); this.current = current;
        this.status({ mode: "offline", pending: true, message: "The database cannot be reached. Your changes are saved on this device and will retry automatically." });
        return current;
      }
      this.status({ mode: "online", pending: false, message: "" });
      throw error; // A permission/validation error must not masquerade as offline success.
    }
  }
  async sync(choice?: ConflictChoice): Promise<TrackerState> {
    this.check();
    const queue = this.queue();
    if (!queue) {
      if (!this.online()) { this.checkpoint(); return this.current; }
      return this.accept(await this.database.read());
    }
    this.current = queue.current; this.base = queue.base; this.revision = queue.revision; this.initialized = true;
    if (!this.online()) {
      this.status({ mode: "offline", pending: queue.pending, message: "No internet connection. Working from this device’s offline copy." });
      return this.current;
    }
    this.status({ mode: "syncing", pending: queue.pending, message: "Syncing your offline changes…" });
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const latest = await this.database.read();
        this.check();
        const merged = mergeBoards(queue.base, queue.current, latest.state, choice);
        if (merged.conflicts.length) {
          this.status({ mode: "conflict", pending: queue.pending, message: "Some offline edits conflict with changes made online. Choose which version of those edits to keep; new sessions and unrelated edits are preserved." });
          return this.current;
        }
        if (sameValue(merged.state, latest.state)) return this.accept(latest);
        try {
          const revision = await this.database.write(merged.state, latest.revision);
          return this.accept({ state: merged.state, revision });
        } catch (error) {
          if (error instanceof DatabaseFailure && error.code === "40001" && attempt < 2) continue;
          throw error;
        }
      }
    } catch (error) {
      this.check();
      this.status({ mode: !this.online() || networkFailure(error) ? "offline" : "pending", pending: queue.pending,
        message: !this.online() || networkFailure(error) ? "No connection to the database. Offline changes remain on this device; syncing will retry." : `${(error as Error).message} Your offline changes remain saved on this device.` });
    }
    return this.current;
  }
}
