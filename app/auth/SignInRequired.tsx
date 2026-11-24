"use client";

import { LockKeyhole } from "lucide-react";
import { useAuth } from "./AuthProvider";
import AccountButtons from "./AccountButtons";
import ThemeToggle from "../growth-board/ThemeToggle";
import styles from "../growth-board/tracker.module.css";

export function SignInRequired({ growth = false }: { growth?: boolean }) {
  const notice = <section className="mx-auto flex w-full max-w-md flex-col items-center px-6 py-16 text-center">
    <LockKeyhole size={28} aria-hidden="true" className="mb-4 opacity-70" />
    <h1 className="text-2xl font-extrabold tracking-tight">Sign in to view your board</h1>
    <p className={`mt-3 mb-6 text-sm ${growth ? "text-[var(--tracker-muted)]" : "text-neutral-500"}`}>
      Your skills and practice history are hidden while you’re signed out.
    </p>
    <AccountButtons growth={growth} />
  </section>;
  if (!growth) return notice;
  return <div className={styles.root}>
    <header className={styles.header}>
      <a href="/growth-board" className="text-xl font-extrabold tracking-tight sm:text-2xl">
        Growth Board<span className="text-[var(--tracker-accent)]">.</span>
      </a>
      <ThemeToggle />
    </header>
    <main className={styles.main}>{notice}</main>
  </div>;
}

export default function AccountVisibility({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <p role="status" className="p-6 text-center text-sm">Opening your account…</p>;
  if (!user) return <SignInRequired />;
  return children;
}
