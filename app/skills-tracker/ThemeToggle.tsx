"use client";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { TRACKER_THEME_KEY } from "./theme-config";
import styles from "./tracker.module.css";
const CHANGE = "skills-tracker:theme-changed";
function snapshot() {
  return document.documentElement.dataset.skillsTheme === "dark";
}
function restoreTheme() {
  try {
    document.documentElement.dataset.skillsTheme =
      localStorage.getItem(TRACKER_THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    /* Keep the current theme if storage is unavailable. */
  }
}
function subscribe(listener: () => void) {
  restoreTheme();
  const storage = (event: StorageEvent) => {
    if (event.key === TRACKER_THEME_KEY || event.key === null) {
      restoreTheme();
      listener();
    }
  };
  window.addEventListener(CHANGE, listener);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(CHANGE, listener);
    window.removeEventListener("storage", storage);
  };
}
export default function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, snapshot, () => false);
  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.skillsTheme = next;
    try {
      localStorage.setItem(TRACKER_THEME_KEY, next);
    } catch {
      /* The toggle still works for this visit. */
    }
    window.dispatchEvent(new Event(CHANGE));
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      className={styles.themeToggle}
    >
      <span className={styles.themeStars} aria-hidden="true">
        ✦
      </span>
      <span className={styles.themeThumb} aria-hidden="true">
        <Sun size={16} className={styles.themeSun} />
        <Moon size={16} className={styles.themeMoon} />
      </span>
    </button>
  );
}
