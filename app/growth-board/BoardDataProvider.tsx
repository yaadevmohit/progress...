"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import AccountButtons from "../auth/AccountButtons";
import BoardSkeleton from "./BoardSkeleton";
import { requireSupabase } from "../lib/supabase";
import { loadAccountBoard } from "./account-board";
import { decodeTracker, EMPTY_STATE } from "./model";
import { AccountSync, DatabaseFailure, offlineKey, type SyncStatus } from "./offline-sync";
import type { ConflictChoice } from "./offline-merge";
import { configureTracker, GUEST_STORAGE_KEY, importGuestTracker, replaceTracker, synchronizeTracker } from "./storage";

const INITIAL_STATUS: SyncStatus = { mode: "online", pending: false, message: "" };
const BoardContext = createContext({ signedIn: false, saving: false, canImport: false, importBrowser: async () => {},
  status: INITIAL_STATUS, refresh: (async () => {}) as (choice?: ConflictChoice) => Promise<void> });
export function BoardRefreshButton() {
  const { signedIn, saving, refresh } = useContext(BoardContext);
  if (!signedIn) return null;
  return <button type="button" aria-label={saving ? "Saving board" : "Refresh board"}
    title={saving ? "Saving changes…" : "Refresh board"} disabled={saving} onClick={() => void refresh()}
    className="mt-1 cursor-pointer rounded-lg p-1.5 text-[var(--tracker-muted)] opacity-60 transition-opacity hover:bg-[var(--tracker-hover)] hover:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--tracker-action)] disabled:cursor-default">
    <RefreshCw size={14} aria-hidden="true" className={saving ? "motion-safe:animate-spin" : ""} />
  </button>;
}
export function BoardSyncStatus() {
  const { signedIn, saving, canImport, importBrowser, status, refresh } = useContext(BoardContext);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!signedIn || (!canImport && status.mode === "online")) return null;
  return <div className="mb-4 rounded-xl border border-[var(--tracker-line)] bg-[var(--tracker-soft)] px-4 py-3 text-xs text-[var(--tracker-ink)]">
    {status.message && <p role="status" className="flex items-center gap-2">
      {status.mode === "offline" && <WifiOff size={15} className="shrink-0" aria-hidden="true" />}{status.message}
    </p>}
    {status.mode === "conflict" ? <div className="mt-2 flex flex-wrap gap-4">
      <button disabled={saving} className="font-bold underline" onClick={() => void refresh("server")}>Keep online edits</button>
      <button disabled={saving} className="font-bold underline" onClick={() => void refresh("device")}>Use this device’s edits</button>
    </div> : (status.mode === "pending" || (status.mode === "offline" && status.pending)) &&
      <button disabled={saving} className="mt-2 font-bold underline" onClick={() => void refresh()}>Retry sync</button>}
    {canImport && <div className="mt-2 flex flex-wrap items-center gap-2">
      <span>You have progress saved in this browser.</span>
      <button disabled={busy || saving || status.mode !== "online"} className="font-bold underline disabled:opacity-50" onClick={async () => {
        setBusy(true); setError("");
        try { await importBrowser(); } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
      }}>{busy ? "Importing…" : "Import into this account"}</button>
    </div>}
    {error && <p role="alert" className="mt-2 text-[var(--tracker-error)]">{error}</p>}
  </div>;
}

export default function BoardDataProvider({ children }: { children: React.ReactNode }) {
  const { user, ready, error: authError } = useAuth();
  const userId = user?.id, owner = userId ?? "guest";
  const [loadedFor, setLoadedFor] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState(INITIAL_STATUS);
  const [canImport, setCanImport] = useState(false);
  const controller = useRef<AccountSync | null>(null);
  const refresh = useCallback(async (choice?: ConflictChoice) => {
    const sync = controller.current;
    if (!sync) return;
    try { await synchronizeTracker(() => sync.sync(choice)); }
    catch (error) { setStatus({ mode: "pending", pending: true, message: (error as Error).message }); }
  }, []);
  useEffect(() => {
    if (!ready) return;
    let alive = true, retrying = false, booting = true;
    configureTracker(userId ?? null, null, true);
    async function load() {
      try {
        if (userId) {
          const client = requireSupabase();
          const publish = (value: SyncStatus) => { if (alive) setStatus(value); };
          const read = async () => {
            const { data, error } = await client.from("growth_boards").select("board, revision").eq("user_id", userId).abortSignal(AbortSignal.timeout(12000)).maybeSingle();
            if (error) throw new DatabaseFailure(error.message, error.code);
            const decoded = decodeTracker(JSON.stringify(data?.board ?? EMPTY_STATE));
            if (decoded.error) throw new Error(decoded.error);
            return { state: decoded.state, revision: data?.revision ?? 0 };
          };
          const write = async (state: typeof EMPTY_STATE, revision: number) => {
            const { data, error } = await client.rpc("save_growth_board", { board_data: state, expected_revision: revision, board_owner: userId }).abortSignal(AbortSignal.timeout(12000));
            if (error) throw new DatabaseFailure(error.message, error.code);
            if (typeof data !== "number") throw new Error("The database did not acknowledge the save.");
            return data;
          };
          const sync = new AccountSync(userId, { read, write }, localStorage, () => navigator.onLine, () => alive, publish);
          controller.current = sync;
          const bootstrap = async () => {
            const work = () => loadAccountBoard({
              read: async () => client.from("growth_boards").select("board, revision").eq("user_id", userId).abortSignal(AbortSignal.timeout(12000)).maybeSingle(),
              create: async state => client.rpc("save_growth_board", { board_data: state, expected_revision: 0, board_owner: userId }).abortSignal(AbortSignal.timeout(12000)),
            }, localStorage);
            return work();
          };
          // Use the account lock for initial replay as well as subsequent writes.
          const key = `${GUEST_STORAGE_KEY}.user.${userId}`;
          const state = navigator.locks
            ? await navigator.locks.request(GUEST_STORAGE_KEY, () => navigator.locks.request(key, () => sync.open(bootstrap)))
            : await sync.open(bootstrap);
          if (!alive) return;
          configureTracker(userId, { memoryOnly: true, canImport: () => navigator.onLine && !localStorage.getItem(offlineKey(userId)), save: (next, previous) => sync.save(next, previous) });
          replaceTracker(state);
          const guest = decodeTracker(localStorage.getItem(GUEST_STORAGE_KEY) ?? JSON.stringify(EMPTY_STATE));
          setCanImport(!state.skills.length && !state.sessions.length && !state.activeTimer && !guest.error && !!(guest.state.skills.length || guest.state.sessions.length || guest.state.activeTimer));
        } else { configureTracker(null); controller.current = null; setCanImport(false); }
        if (alive) { setError(""); setLoadedFor(owner); booting = false; }
      } catch (error) { if (alive) setError(`Could not open your account board: ${(error as Error).message}`); }
    }
    const retry = async () => {
      if (!alive || booting || retrying || !controller.current) return;
      retrying = true;
      try { await refresh(); } finally { retrying = false; }
    };
    const offline = () => {
      const sync = controller.current;
      if (booting || !sync) return;
      void synchronizeTracker(async () => sync.checkpoint()).catch((error: Error) => {
        if (alive) setStatus({ mode: "pending", pending: true, message: `Could not save offline: ${error.message}. Keep this page open and reconnect.` });
      });
    };
    const changed = (event: StorageEvent) => {
      if (userId && event.key === offlineKey(userId)) void retry();
    };
    void load();
    window.addEventListener("offline", offline);
    window.addEventListener("online", retry);
    window.addEventListener("focus", retry);
    window.addEventListener("storage", changed);
    // Retry transport failures even when the browser still reports "online".
    const interval = window.setInterval(() => {
      if (userId && localStorage.getItem(offlineKey(userId))) void retry();
    }, 15000);
    return () => {
      alive = false; controller.current = null; configureTracker(null, null, true);
      window.removeEventListener("offline", offline); window.removeEventListener("online", retry);
      window.removeEventListener("focus", retry); window.removeEventListener("storage", changed);
      window.clearInterval(interval);
    };
  }, [ready, userId, owner, refresh]);

  if (error || authError) return <main className="mx-auto w-full max-w-3xl p-6">
    <div className="mb-6 flex justify-end"><AccountButtons /></div>
    <p role="alert">{error || authError}</p><button className="mt-4 underline" onClick={() => location.reload()}>Retry loading board</button>
  </main>;
  if (!ready || loadedFor !== owner) return <BoardSkeleton />;
  return <BoardContext.Provider value={{ signedIn: !!user, saving: status.mode === "syncing", canImport, status, refresh,
    importBrowser: async () => { await importGuestTracker(); setCanImport(false); } }}>{children}</BoardContext.Provider>;
}
