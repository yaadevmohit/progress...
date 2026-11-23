"use client";

import { requireSupabase } from "../../lib/supabase";
import styles from "./AuthDialog.module.css";
import { X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

export type AuthMode = "login" | "signup";

export default function AuthDialog({ mode, onModeChange, onClose, growth = false }: {
  growth?: boolean;
  mode: AuthMode | null;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const signup = mode === "signup";

  useEffect(() => {
    if (mode && !dialog.current?.open) dialog.current?.showModal();
  }, [mode]);

  function switchMode() {
    setError("");
    setMessage("");
    onModeChange(signup ? "login" : "signup");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setMessage("");
    if (signup && !String(fields.get("name") ?? "").trim()) {
      setError("Please enter your name.");
      return;
    }
    if (signup && fields.get("password") !== fields.get("confirmPassword")) {
      setError("Passwords don’t match.");
      event.currentTarget.querySelector<HTMLInputElement>('[name="confirmPassword"]')?.focus();
      return;
    }
    setError("");
    setBusy(true);
    const form = event.currentTarget;
    try {
      const client = requireSupabase();
      const email = String(fields.get("email") ?? "").trim();
      const password = String(fields.get("password") ?? "");
      const { data, error } = signup
        ? await client.auth.signUp({ email, password, options: {
            data: { display_name: String(fields.get("name")).trim() },
            emailRedirectTo: `${location.origin}/growth-board`,
          } })
        : await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      form.reset();
      if (data.session) dialog.current?.close();
      else setMessage("Check your email to confirm your account, then sign in. If you already have an account, try signing in.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not sign in. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <dialog
      ref={dialog}
      onCancel={(event) => { if (busy) event.preventDefault(); }}
      aria-labelledby="auth-title"
      aria-describedby="auth-description"
      onClose={() => {
        dialog.current?.querySelector("form")?.reset();
        setMessage("");
        setError("");
        onClose();
      }}
      className={`${styles.dialog} ${growth ? styles.growth : ""} p-5 sm:p-7 motion-safe:open:animate-[panel-enter_220ms_ease-out_both]`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={styles.eyebrow}>{growth ? "Growth Board." : "progress.."}</p>
          <h2 id="auth-title" className="mt-2 text-2xl font-extrabold tracking-tight">
            {signup ? "Create your account" : "Welcome back"}
          </h2>
          <p id="auth-description" className={`mt-1 text-sm ${styles.muted}`}>
            {signup ? "Make a little progress, every day." : "Log in to keep your progress going."}
          </p>
        </div>
        <button type="button" disabled={busy} aria-label="Close" onClick={() => dialog.current?.close()} className={styles.close}>
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setError("");
          setBusy(true);
          try {
            const { error } = await requireSupabase().auth.signInWithOAuth({
              provider: "google", options: { redirectTo: `${location.origin}/growth-board` },
            });
            if (error) throw error;
          } catch (error) {
            setError(error instanceof Error ? error.message : "Could not start Google sign-in.");
          } finally { setBusy(false); }
        }}
        className={styles.provider}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
          <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36Z" />
          <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.23-2.51c-.9.6-2.05.96-3.39.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22Z" />
          <path fill="#FBBC05" d="M6.4 13.92a6 6 0 0 1 0-3.84V7.49H3.06a10 10 0 0 0 0 9.02l3.34-2.59Z" />
          <path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.83 1.51l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.94 5.49l3.34 2.59C7.19 7.72 9.4 5.96 12 5.96Z" />
        </svg>
        {signup ? "Sign up with Google" : "Log in with Google"}
      </button>

      <div className={styles.divider}>
        <span className={styles.rule} />
        or continue with email
        <span className={styles.rule} />
      </div>

      <form key={mode} onSubmit={submit}><fieldset disabled={busy} className="space-y-4 disabled:opacity-60 motion-safe:animate-[panel-enter_180ms_ease-out_both]">
        {signup && (
          <label className="block text-sm font-bold">
            Name
            <input name="name" autoComplete="name" required placeholder="Your name" className={styles.input} />
          </label>
        )}
        <label className="block text-sm font-bold">
          Email
          <input name="email" type="email" autoComplete="email" required placeholder="you@example.com" className={styles.input} />
        </label>
        <label className="block text-sm font-bold">
          Password
          <input name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 8 : undefined} placeholder={signup ? "At least 8 characters" : "Your password"} className={styles.input} />
        </label>
        {signup && (
          <label className="block text-sm font-bold">
            Confirm password
            <input name="confirmPassword" type="password" autoComplete="new-password" required placeholder="Re-enter your password" className={styles.input} onChange={() => setError("")} />
          </label>
        )}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {message && <p role="status" className={styles.message}>{message}</p>}
        <button type="submit" className={styles.submit}>
          {busy ? "Please wait…" : signup ? "Create account" : "Log in"}
        </button>
      </fieldset></form>

      <p className={`mt-5 text-center text-sm ${styles.muted}`}>
        {signup ? "Already have an account? " : growth ? "New to Growth Board? " : "New to progress..? "}
        <button type="button" disabled={busy} onClick={switchMode} className={styles.switchMode}>
          {signup ? "Log in" : "Sign up"}
        </button>
      </p>
    </dialog>
  );
}
