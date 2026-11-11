"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

export type AuthMode = "login" | "signup";

const INPUT_CLASS = "mt-1.5 w-full rounded-xl border border-blue-100 bg-blue-50/40 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-2 focus:outline-blue-500/20";

export default function AuthDialog({ mode, onModeChange, onClose }: {
  mode: AuthMode | null;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
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

  function submit(event: FormEvent<HTMLFormElement>) {
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
    setMessage("This is a preview. Account authentication isn’t connected yet.");
    event.currentTarget.reset();
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="auth-title"
      aria-describedby="auth-description"
      onClose={() => {
        dialog.current?.querySelector("form")?.reset();
        setMessage("");
        setError("");
        onClose();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-blue-100 bg-white p-5 text-neutral-900 shadow-xl backdrop:bg-black/45 sm:p-6 motion-safe:open:animate-[panel-enter_220ms_ease-out_both]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-wider text-blue-600 uppercase">progress..</p>
          <h2 id="auth-title" className="mt-2 text-2xl font-semibold tracking-tight text-blue-950">
            {signup ? "Create your account" : "Welcome back"}
          </h2>
          <p id="auth-description" className="mt-1 text-sm text-neutral-500">
            {signup ? "Make a little progress, every day." : "Log in to keep your progress going."}
          </p>
        </div>
        <button type="button" aria-label="Close" onClick={() => dialog.current?.close()} className="cursor-pointer rounded-lg p-1.5 text-blue-600 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600">
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          setError("");
          setMessage("Google sign-in isn’t connected in this preview yet.");
        }}
        className="mt-6 flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-semibold text-blue-950 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
          <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36Z" />
          <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.23-2.51c-.9.6-2.05.96-3.39.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22Z" />
          <path fill="#FBBC05" d="M6.4 13.92a6 6 0 0 1 0-3.84V7.49H3.06a10 10 0 0 0 0 9.02l3.34-2.59Z" />
          <path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.83 1.51l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.94 5.49l3.34 2.59C7.19 7.72 9.4 5.96 12 5.96Z" />
        </svg>
        {signup ? "Sign up with Google" : "Log in with Google"}
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-neutral-400">
        <span className="h-px flex-1 bg-blue-100" />
        or continue with email
        <span className="h-px flex-1 bg-blue-100" />
      </div>

      <form key={mode} onSubmit={submit} className="space-y-4 motion-safe:animate-[panel-enter_180ms_ease-out_both]">
        {signup && (
          <label className="block text-sm font-semibold text-blue-950">
            Name
            <input name="name" autoComplete="name" required placeholder="Your name" className={INPUT_CLASS} />
          </label>
        )}
        <label className="block text-sm font-semibold text-blue-950">
          Email
          <input name="email" type="email" autoComplete="email" required placeholder="you@example.com" className={INPUT_CLASS} />
        </label>
        <label className="block text-sm font-semibold text-blue-950">
          Password
          <input name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 8 : undefined} placeholder={signup ? "At least 8 characters" : "Your password"} className={INPUT_CLASS} />
        </label>
        {signup && (
          <label className="block text-sm font-semibold text-blue-950">
            Confirm password
            <input name="confirmPassword" type="password" autoComplete="new-password" required placeholder="Re-enter your password" className={INPUT_CLASS} onChange={() => setError("")} />
          </label>
        )}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}
        <button type="submit" className="w-full cursor-pointer rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm shadow-blue-600/15 transition-all hover:bg-blue-700 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
          {signup ? "Create account" : "Log in"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-neutral-500">
        {signup ? "Already have an account? " : "New to progress..? "}
        <button type="button" onClick={switchMode} className="cursor-pointer rounded font-semibold text-blue-600 hover:text-blue-800 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600">
          {signup ? "Log in" : "Sign up"}
        </button>
      </p>
    </dialog>
  );
}
