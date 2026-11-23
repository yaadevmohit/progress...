"use client";
import { useEffect, useId, useRef, useState } from "react";
import { LogOut, MoveRight, UserRound } from "lucide-react";
import AuthDialog, { type AuthMode } from "../ui/components/AuthDialog";
import { firstName, signOut, useAuth } from "./AuthProvider";

export default function AccountButtons({ growth = false }: { growth?: boolean }) {
  const { user, ready } = useAuth();
  const [mode, setMode] = useState<AuthMode | null>(null);
  const [menuOwner, setMenuOwner] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const signOutButton = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const menuOpen = !!user && menuOwner === user.id;
  const base = "cursor-pointer rounded-xl px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 sm:text-sm";

  useEffect(() => {
    if (!menuOpen) return;
    signOutButton.current?.focus();
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setMenuOwner(null);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOwner(null);
        trigger.current?.focus();
      } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        signOutButton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    container.current?.addEventListener("keydown", keyboard);
    const node = container.current;
    return () => {
      document.removeEventListener("pointerdown", outside);
      node?.removeEventListener("keydown", keyboard);
    };
  }, [menuOpen]);

  return <div ref={container} className="relative flex flex-wrap items-center gap-1 sm:gap-2" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setMenuOwner(null);
  }}>
    {user ? <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuOpen ? menuId : undefined}
        onClick={() => { setError(""); setMenuOwner(menuOpen ? null : user.id); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setMenuOwner(user.id);
          }
        }}
        className={`${base} flex items-center gap-2 ${growth ? "hover:bg-[var(--tracker-hover)]" : "hover:bg-neutral-100"}`}
      >
        <UserRound size={17} strokeWidth={2} aria-hidden="true" className="shrink-0" />
        <span className="max-w-28 truncate sm:max-w-36">{firstName(user)}</span>
      </button>
      {menuOpen && <div id={menuId} role="menu" aria-label="Account" className={`absolute left-0 top-full z-50 mt-2 min-w-40 rounded-xl border p-1.5 shadow-lg ${growth ? "border-[var(--tracker-line)] bg-[var(--tracker-field)] text-[var(--tracker-ink)]" : "border-neutral-200 bg-white text-neutral-900"}`}>
        <button ref={signOutButton} type="button" role="menuitem" disabled={busy} className={`${base} flex w-full items-center gap-2 text-left ${growth ? "hover:bg-[var(--tracker-hover)]" : "hover:bg-neutral-100"}`} onClick={async () => {
          setBusy(true); setError("");
          try { await signOut(); setMenuOwner(null); } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
        }}><LogOut size={16} aria-hidden="true" />{busy ? "Signing out…" : "Sign out"}</button>
      </div>}
    </> : <>
      <button disabled={!ready} aria-haspopup="dialog" className={`${base} ${growth ? "hover:bg-[var(--tracker-hover)]" : "text-neutral-900 hover:bg-neutral-100"}`} onClick={() => setMode("login")}>Sign in</button>
      <button disabled={!ready} aria-haspopup="dialog" className={`${base} flex items-center gap-2 ${growth ? "bg-[var(--tracker-ink)] text-[var(--tracker-bg)]" : "bg-neutral-900 text-white hover:bg-black"}`} onClick={() => setMode("signup")}>Sign up <MoveRight size={15} aria-hidden="true" /></button>
    </>}
    {error && <p role="alert" className={`max-w-60 text-xs ${growth ? "text-[var(--tracker-error)]" : "text-red-700"}`}>{error}</p>}
    <AuthDialog growth={growth} mode={mode} onModeChange={setMode} onClose={() => setMode(null)} />
  </div>;
}
