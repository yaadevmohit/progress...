"use client";

import { useSyncExternalStore } from "react";
import { getServerSessionSnapshot, getSessionSnapshot, readSessions, subscribeToSessions } from "../session-log";

import { HOBBIES, RECENT_SESSIONS } from "../mock-data";

export default function RecentSessions() {
  const snapshot = useSyncExternalStore(subscribeToSessions, getSessionSnapshot, getServerSessionSnapshot);
  const loggedSessions = readSessions(snapshot).map((session) => {
    const date = new Date(session.loggedAt);
    return {
      ...session,
      duration: `${session.minutes} min`,
      date: date.toDateString() === new Date().toDateString()
        ? "Today"
        : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    };
  });
  const sessions = [...loggedSessions, ...RECENT_SESSIONS];

  return (
    <div className="bg-white rounded-2xl p-6 border border-neutral-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-neutral-800">Recent Sessions</h2>
        <button className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm transition-colors cursor-pointer">
          View all
        </button>
      </div>

      <div className="space-y-1">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50 px-2 rounded-xl transition-all"
          >
            <div className="flex items-start gap-3 flex-1 min-w-0 pr-4">
              <span
                className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                style={{ backgroundColor: HOBBIES[session.skill] }}
              />
              <div className="min-w-0">
                <span className="font-bold text-neutral-800 mr-2 text-sm sm:text-base">
                  {session.skill}
                </span>
                <p className="text-neutral-500 text-sm mt-0.5 wrap-break-word line-clamp-2">
                  {session.notes}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 mt-2 sm:mt-0 shrink-0 pl-8 sm:pl-0">
              <span className="font-bold text-neutral-800 text-sm">
                {session.duration}
              </span>
              <span className="text-neutral-400 text-xs text-right w-20">
                {session.date}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
