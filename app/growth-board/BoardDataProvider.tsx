"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import AccountButtons from "../auth/AccountButtons";
import { requireSupabase } from "../lib/supabase";
import { decodeTracker, EMPTY_STATE } from "./model";
import { configureTracker, GUEST_STORAGE_KEY, importGuestTracker, replaceTracker } from "./storage";

const BoardContext = createContext({ signedIn: false, saving: false, canImport: false, importBrowser: async () => {} });
export function BoardSyncStatus() {
  const { signedIn, saving, canImport, importBrowser } = useContext(BoardContext);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!signedIn) return null;
  return <div className="mb-4 rounded-xl border border-[var(--tracker-line)] bg-[var(--tracker-soft)] px-4 py-3 text-xs text-[var(--tracker-ink)]">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p role="status">{saving ? "Saving to your account…" : "Account board · Changes save online. Reload to get changes from other devices."}</p>
      <button className="cursor-pointer font-bold underline" onClick={() => location.reload()}>Reload board</button>
    </div>
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
          const { data, error } = await client.from("growth_boards").select("board, revision").eq("user_id", userId).maybeSingle();
          if (error) throw error;
          if (!alive) return;
          const parsed = decodeTracker(JSON.stringify(data?.board ?? EMPTY_STATE));
          if (parsed.error) throw new Error(parsed.error);
          let revision = data?.revision ?? 0;
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
          // Never copy a previous account's cache or the guest board implicitly.
          replaceTracker(parsed.state);
          configureTracker(userId, adapter);
          const guest = decodeTracker(localStorage.getItem(GUEST_STORAGE_KEY) ?? JSON.stringify(EMPTY_STATE));
          setCanImport(!parsed.state.skills.length && !parsed.state.sessions.length && !parsed.state.activeTimer && !parsed.state.retainedPractice?.length && !guest.error && !!(guest.state.skills.length || guest.state.sessions.length || guest.state.activeTimer || guest.state.retainedPractice?.length));
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
