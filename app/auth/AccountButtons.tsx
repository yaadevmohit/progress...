"use client";
import { useState } from "react";
import { MoveRight } from "lucide-react";
import AuthDialog, { type AuthMode } from "../ui/components/AuthDialog";
import { displayName, signOut, useAuth } from "./AuthProvider";

export default function AccountButtons({ growth = false }: { growth?: boolean }) {
  const { user, ready } = useAuth();
  const [mode, setMode] = useState<AuthMode | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const base = "cursor-pointer rounded-xl px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 sm:text-sm";
  return <div className="flex flex-wrap items-center gap-1 sm:gap-2">
    {user ? <>
      <span className="hidden max-w-32 truncate text-sm font-semibold lg:inline" title={user.email}>{displayName(user)}</span>
      <button disabled={busy} className={`${base} ${growth ? "hover:bg-[var(--tracker-hover)]" : "hover:bg-neutral-100"}`} onClick={async () => {
        setBusy(true); setError("");
        try { await signOut(); } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
      }}>{busy ? "Signing out…" : "Sign out"}</button>
    </> : <>
      <button disabled={!ready} aria-haspopup="dialog" className={`${base} ${growth ? "hover:bg-[var(--tracker-hover)]" : "text-neutral-900 hover:bg-neutral-100"}`} onClick={() => setMode("login")}>Sign in</button>
      <button disabled={!ready} aria-haspopup="dialog" className={`${base} flex items-center gap-2 ${growth ? "bg-[var(--tracker-ink)] text-[var(--tracker-bg)]" : "bg-neutral-900 text-white hover:bg-black"}`} onClick={() => setMode("signup")}>Sign up <MoveRight size={15} aria-hidden="true" /></button>
    </>}
    {error && <p role="alert" className="max-w-60 text-xs text-red-700">{error}</p>}
    <AuthDialog growth={growth} mode={mode} onModeChange={setMode} onClose={() => setMode(null)} />
  </div>;
}
