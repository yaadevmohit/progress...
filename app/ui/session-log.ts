import type { Hobby } from "./mock-data";

type LoggedSession = {
  id: string;
  skill: Hobby;
  minutes: number;
  notes: string;
  loggedAt: string;
};

const STORAGE_KEY = "progress.sessions";
const CHANGE_EVENT = "progress:sessions-changed";

export function getSessionSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function getServerSessionSnapshot() {
  return "[]";
}

export function readSessions(snapshot: string): LoggedSession[] {
  try {
    const sessions = JSON.parse(snapshot);
    return Array.isArray(sessions) ? sessions : [];
  } catch {
    return [];
  }
}

export function subscribeToSessions(listener: () => void) {
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function saveSession(skill: Hobby, minutes: number, notes: string) {
  const sessions = readSessions(localStorage.getItem(STORAGE_KEY) ?? "[]");
  const session = { id: crypto.randomUUID(), skill, minutes, notes, loggedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([session, ...sessions]));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
