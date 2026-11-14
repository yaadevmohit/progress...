"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, MoveRight } from "lucide-react";
import styles from "./Header.module.css";
import LogSession from "./LogSession";
import AuthDialog, { type AuthMode } from "./AuthDialog";

export default function Header() {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";
  const [menuOpen, setMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);

  function openAuth(mode: AuthMode) {
    setMenuOpen(false);
    setAuthMode(mode);
  }

  if (pathname === "/get-started" || pathname.startsWith("/job-hunt") || pathname.startsWith("/skills-tracker")) return null;

  return (
    <header className={`${styles.audioSpace} sticky top-0 z-40 mx-auto w-[calc(100%-0.5rem)] max-w-[calc(75rem+2px)] rounded-b-[1.75rem] border-x border-b bg-white px-3 py-3 border-black/10 text-black sm:w-[calc(100%-1rem)] sm:rounded-b-[2rem] sm:px-6`}>
      <nav className="mx-auto flex max-w-6xl items-center justify-between">

        {/* Logo */}
        <span className="shrink-0 text-2xl leading-none font-semibold tracking-[-0.055em] sm:text-3xl">
          progress..
        </span>

        {/* Right-side actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isDashboard && <LogSession />}
          {/* Desktop: Login & Sign Up visible inline */}
          <div className={`hidden flex-row gap-2 md:flex ${isDashboard ? "border-l border-neutral-200 pl-2" : ""}`}>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => openAuth("login")}
              className={`${styles.authButton} ${styles.login}`}
            >
              Log in
            </button>
          <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => openAuth("signup")}
              className={`group ${styles.authButton} ${styles.signup}`}
            >
              Sign up
              <div className="relative h-5 w-5 text-sm font-bold overflow-hidden">
                <div className="flex flex-col transition-transform duration-300 ease-in-out translate-y-0.75 group-hover:-translate-y-3.25 my-auto">
                  <MoveRight size={16} strokeWidth={2.5} />
                  <MoveRight size={16} strokeWidth={2.5} />
                </div>
              </div>
          </button>
          </div>

          {/* Mobile: Hamburger toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`md:hidden cursor-pointer rounded-xl p-2 transition-colors text-neutral-600 hover:bg-neutral-100`}
            aria-label="Toggle menu"
          >
            {menuOpen
              ? <X size={20} strokeWidth={2} />
              : <Menu size={20} strokeWidth={2} />}
          </button>
        </div>

      </nav>

      {/* Mobile dropdown — always in DOM, animated via max-height + opacity */}
      <div
        inert={!menuOpen}
        className={`md:hidden absolute left-0 right-0 top-full mt-1 rounded-2xl bg-white border border-black/10
                    shadow-lg z-50 overflow-hidden transition-all duration-300 ease-in-out
                    ${menuOpen ? "max-h-40 opacity-100" : "pointer-events-none max-h-0 opacity-0 border-transparent shadow-none"}`}
      >
        <div className="px-6 py-4 flex flex-col gap-3 text-neutral-900">
          {["Log in", "Sign up"].map((label) => (
            <button key={label} type="button" aria-haspopup="dialog" onClick={() => openAuth(label === "Log in" ? "login" : "signup")} className={`${styles.authButton} ${label === "Log in" ? styles.login : styles.signup}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <AuthDialog mode={authMode} onModeChange={setAuthMode} onClose={() => setAuthMode(null)} />
    </header>
  );
}
