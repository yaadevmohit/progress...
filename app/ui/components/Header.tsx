"use client";
import { usePathname } from "next/navigation";
import styles from "./Header.module.css";
import LogSession from "./LogSession";
import { useAuth } from "../../auth/AuthProvider";
import AccountButtons from "../../auth/AccountButtons";

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  if (pathname === "/get-started" || pathname.startsWith("/job-hunt") || pathname.startsWith("/growth-board")) return null;
  return <header className={`${styles.audioSpace} sticky top-0 z-40 mx-auto w-[calc(100%-0.5rem)] max-w-[calc(75rem+2px)] rounded-b-[1.75rem] border-x border-b border-black/10 bg-white px-3 py-3 text-black sm:w-[calc(100%-1rem)] sm:rounded-b-[2rem] sm:px-6`}>
    <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
      <span className="shrink-0 text-2xl leading-none font-semibold tracking-[-0.055em] sm:text-3xl">progress..</span>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {pathname === "/dashboard" && user && <LogSession />}
        <AccountButtons />
      </div>
    </nav>
  </header>;
}
