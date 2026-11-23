"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import AccountButtons from "../auth/AccountButtons";
import { requireSupabase } from "../lib/supabase";
import { loadAccountBoard } from "./account-board";
import { decodeTracker, EMPTY_STATE } from "./model";
import { configureTracker, GUEST_STORAGE_KEY, importGuestTracker, replaceTracker } from "./storage";

const BoardContext = createContext({ signedIn: false, saving: false, canImport: false, importBrowser: async () => {} });
export function BoardRefreshButton() {
  const { signedIn, saving } = useContext(BoardContext);
  if (!signedIn) return null;
  return <button
    type="button"
    aria-label={saving ? "Saving board" : "Refresh board"}
    title={saving ? "Saving changes…" : "Refresh board"}
    disabled={saving}
    onClick={() => location.reload()}
    className="mt-1 cursor-pointer rounded-lg p-1.5 text-[var(--tracker-muted)] opacity-60 transition-opacity hover:bg-[var(--tracker-hover)] hover:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--tracker-action)] disabled:cursor-default"
  >
    <RefreshCw size={14} aria-hidden="true" className={saving ? "motion-safe:animate-spin" : ""} />
  </button>;
}

export function BoardSyncStatus() {
  const { signedIn, saving, canImport, importBrowser } = useContext(BoardContext);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!signedIn || !canImport) return null;
  return <div className="mb-4 rounded-xl border border-[var(--tracker-line)] bg-[var(--tracker-soft)] px-4 py-3 text-xs text-[var(--tracker-ink)]">
    {canImport && <div className="mt-2 flex flex-wrap items-center gap-2">
      <span>You have progress saved in this browser.</span>
      <button disabled={busy || saving} className="cursor-pointer font-bold underline disabled:opacity-50" onClick={async () => {
        setBusy(true); setError("");
        try { await importBrowser(); } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
      }}>{busy ? "Importing…" : "Import into this account"}</button>
    </div>}
    {error && <p role="alert" className="mt-2 text-[var(--tracker-error)]">{error}</p>}
  </div>;
}

export default function BoardDataProvider({ children }: { children: React.ReactNode }) {
  const { user, ready, error: authError } = useAuth();
  const userId = user?.id;
  const owner = userId ?? "guest";
  const [loadedFor, setLoadedFor] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [canImport, setCanImport] = useState(false);
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    configureTracker(userId ?? null, null, true);
    async function load() {
      try {
        if (userId) {
          const client = requireSupabase();
          const loadBoard = () => loadAccountBoard({
            read: async () => client.from("growth_boards").select("board, revision").eq("user_id", userId).maybeSingle(),
            create: async (state) => client.rpc("save_growth_board", {
              board_data: state, expected_revision: 0, board_owner: userId,
            }),
          }, localStorage);
          // Serialize transfer with guest edits made in other app tabs.
          const loaded = navigator.locks
            ? await navigator.locks.request(GUEST_STORAGE_KEY, loadBoard)
            : await loadBoard();
          if (!alive) return;
          const state = loaded.state;
          let revision = loaded.revision;
          const adapter = { save: async (state: typeof EMPTY_STATE) => {
            if (!alive) throw new Error("Your account changed. Reload your board.");
            setSaving(true);
            try {
              const { data, error } = await client.rpc("save_growth_board", { board_data: state, expected_revision: revision, board_owner: userId });
              if (error) throw new Error(error.code === "40001" ? "Your board changed in another tab or device. Reload the board and try again." : `Could not save online: ${error.message}. Your change was not saved; please try again.`);
              revision = data;
              if (alive) setCanImport(false);
            } finally { if (alive) setSaving(false); }
          } };
          // Account caches are never used as a source for a different user.
          replaceTracker(state);
          configureTracker(userId, adapter);
          const guest = decodeTracker(localStorage.getItem(GUEST_STORAGE_KEY) ?? JSON.stringify(EMPTY_STATE));
          setCanImport(!state.skills.length && !state.sessions.length && !state.activeTimer && !state.retainedPractice?.length && !guest.error && !!(guest.state.skills.length || guest.state.sessions.length || guest.state.activeTimer || guest.state.retainedPractice?.length));
        } else {
          configureTracker(null);
          setCanImport(false);
        }
        if (alive) { setError(""); setSaving(false); setLoadedFor(owner); }
      } catch (error) {
        if (alive) setError(`Could not open your account board: ${(error as Error).message}`);
      }
    }
    void load();
    return () => { alive = false; configureTracker(null, null, true); };
  }, [ready, userId, owner]); // Only switch boards when the owner changes, not on token refresh.

  if (!ready || loadedFor !== owner || error || authError) return <main className="mx-auto w-full max-w-3xl p-6">
    <div className="mb-6 flex justify-end"><AccountButtons /></div>
    {error || authError ? <><p role="alert">{error || authError}</p><button className="mt-4 cursor-pointer underline" onClick={() => location.reload()}>Retry loading board</button></> : <p role="status">Opening your board…</p>}
  </main>;
  return <BoardContext.Provider value={{ signedIn: !!user, saving, canImport, importBrowser: async () => { await importGuestTracker(); } }}>
    {children}
  </BoardContext.Provider>;
}
