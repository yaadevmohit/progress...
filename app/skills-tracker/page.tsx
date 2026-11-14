"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Download, Flame, Plus, X } from "lucide-react";
import SkillComposer from "./SkillComposer";
import SkillResources from "./SkillResources";
import SessionDialog from "./SessionDialog";
import {
  currentStreak,
  durationLabel,
  localDay,
  MAX_SKILLS,
  mostPractised,
  REMINDER_INTERVAL,
  skillStats,
  weeklyActivity,
  type ActiveTimer,
  type LearningSession,
} from "./model";
import {
  cancelTimer,
  dismissReminder,
  exportTracker,
  finishTimer,
  useClock,
  useTracker,
} from "./storage";
import styles from "./tracker.module.css";
function dateLabel(day: string) {
  return new Date(day + "T12:00:00Z").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
function Heatmap({
  sessions,
  today,
}: {
  sessions: LearningSession[];
  today: string;
}) {
  const [offset, setOffset] = useState(0);
  const { start, end, weeks } = weeklyActivity(sessions, today, offset);
  const max = Math.max(...weeks.map((w) => w.seconds), 1),
    colors = ["#ecefed", "#d1fae5", "#6ee7b7", "#34d399", "#059669"];
  const month = (day: string) =>
    new Date(day + "T12:00:00Z").toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  return (
    <section
      className={`${styles.panel} ${styles.activity}`}
      aria-labelledby="activity-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="activity-title" className="text-xl font-bold">
            Activity
          </h2>
          <p className="mt-1 text-xs font-semibold text-neutral-500">
            {sessions.length
              ? `${dateLabel(start)} – ${dateLabel(end)}, ${end.slice(0, 4)}`
              : month(start)}{" "}
            · each block is one week
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            aria-label="Previous month"
            onClick={() => setOffset(offset - 1)}
            className={styles.icon}
          >
            <ArrowLeft size={16} />
          </button>
          <button
            onClick={() => setOffset(0)}
            className="rounded-lg px-2 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
          >
            Today
          </button>
          <button
            aria-label="Next month"
            disabled={offset === 0}
            onClick={() => setOffset(offset + 1)}
            className={styles.icon}
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
      <div
        className={styles.weeks}
        key={`${start}-${end}-${sessions.length}`}
        style={{ gridTemplateColumns: `repeat(${weeks.length},minmax(0,1fr))` }}
      >
        {weeks.map((week) => {
          const level = week.seconds
            ? Math.max(1, Math.ceil((week.seconds / max) * 4))
            : 0;
          const description = `${dateLabel(week.start)} – ${dateLabel(week.end)}: ${week.count} ${week.count === 1 ? "session" : "sessions"}, ${durationLabel(week.seconds)}, ${week.activeDays} active ${week.activeDays === 1 ? "day" : "days"}`;
          return (
            <div key={week.start} className={styles.week}>
              <button
                type="button"
                className={styles.tile}
                aria-label={description}
                style={{ backgroundColor: colors[level] }}
              >
                <span role="tooltip" className={styles.tooltip}>
                  {description}
                </span>
              </button>
              <span className="mt-2 block text-center text-[10px] text-neutral-500">
                {new Date(week.start + "T12:00:00Z").getUTCDate()}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-auto flex justify-end gap-1.5 text-[11px] font-semibold text-neutral-500">
        <span className="mr-1">Less</span>
        {colors.map((color) => (
          <span
            key={color}
            aria-hidden="true"
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: color }}
          />
        ))}
        <span className="ml-1">More</span>
      </div>
    </section>
  );
}
function Timer({
  timer,
  name,
  now,
  onError,
}: {
  timer: ActiveTimer;
  name: string;
  now: number;
  onError: (message: string) => void;
}) {
  const remaining = Math.min(
      timer.minutes * 60,
      Math.max(0, Math.ceil((timer.endsAt - now) / 1000)),
    ),
    elapsed = Math.max(0, Math.floor((now - timer.startedAt) / 1000));
  const ratio = remaining / (timer.minutes * 60),
    [busy, setBusy] = useState(false);
  async function action(finish: boolean) {
    setBusy(true);
    try {
      if (finish) await finishTimer(timer.id, true);
      else await cancelTimer(timer.id);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={`${styles.panel} ${styles.timer}`}
      aria-label="Focus timer"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="truncate text-sm font-bold">{name}</h2>
        <span className="text-xs font-semibold text-emerald-700">In focus</span>
      </div>
      <div className="relative mx-auto my-1 grid h-36 w-36 place-items-center">
        <svg
          viewBox="0 0 160 160"
          className="absolute inset-0 h-full w-full -rotate-90"
          aria-hidden="true"
        >
          {Array.from({ length: 60 }, (_, i) => (
            <line
              key={i}
              x1="80"
              y1="9"
              x2="80"
              y2={i % 5 === 0 ? 23 : 18}
              transform={`rotate(${i * 6} 80 80)`}
              stroke={i / 60 < ratio ? "#059669" : "#e5e7eb"}
              strokeWidth="2.5"
            />
          ))}
        </svg>
        <span
          role="timer"
          aria-label={`${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds remaining`}
          className="text-3xl font-bold tabular-nums text-emerald-950"
        >
          {String(Math.floor(remaining / 60)).padStart(2, "0")}:
          {String(remaining % 60).padStart(2, "0")}
        </span>
      </div>
      <div className="flex justify-center gap-4 text-xs">
        <button
          disabled={busy || elapsed < 60}
          onClick={() => void action(true)}
          className="font-bold text-emerald-800 disabled:opacity-35"
        >
          Finish & save
        </button>
        <button
          disabled={busy}
          onClick={() => void action(false)}
          className="text-neutral-500"
        >
          Cancel timer
        </button>
      </div>
    </section>
  );
}
export default function SkillsTracker() {
  const { state, error: storageError, ready } = useTracker(),
    now = useClock();
  const today = now ? localDay(new Date(now)) : "2000-01-01";
  const [editing, setEditing] = useState<number | null>(null),
    [session, setSession] = useState<string | null>(null),
    [error, setError] = useState("");
  const attemptedTimer = useRef<string | null>(null);
  const stats = skillStats(state, today),
    leader = mostPractised(state, today),
    streak = currentStreak(state.sessions, today),
    total = stats.reduce((sum, s) => sum + s.seconds, 0),
    share = leader ? Math.round((leader.seconds / total) * 100) : 0;
  const timer = state.activeTimer;
  useEffect(() => {
    if (
      !timer ||
      !now ||
      now < timer.endsAt ||
      attemptedTimer.current === timer.id
    )
      return;
    attemptedTimer.current = timer.id;
    void finishTimer(timer.id).catch((e) => setError((e as Error).message));
  }, [timer, now]);
  const reminder =
    ready &&
    now !== null &&
    (state.reminderDismissedAt === null ||
      now - state.reminderDismissedAt >= REMINDER_INTERVAL);
  const canEdit = ready && !storageError;
  async function snooze() {
    try {
      await dismissReminder();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <a
          href="/skills-tracker"
          className="text-xl font-extrabold tracking-tight sm:text-2xl"
        >
          Skills Tracker<span className="text-emerald-600">.</span>
        </a>
        <div className="flex items-center gap-2">
          <button
            aria-label="Export tracker backup"
            onClick={() => {
              try {
                exportTracker();
              } catch {
                setError(
                  "Couldn’t export your browser data. Check your browser storage settings.",
                );
              }
            }}
            className={styles.icon}
          >
            <Download size={18} />
          </button>
          <button
            disabled={!canEdit}
            onClick={() => setSession("")}
            className={styles.primary}
          >
            <Plus
              size={16}
              strokeWidth={2.75}
              aria-hidden="true"
              className={styles.sessionPlus}
            />
            Log session
          </button>
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.stage}>
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Hello, learner<span className="text-emerald-600">.</span>
              </h1>
              <p className="mt-1 text-sm font-semibold text-neutral-500">
                Make a little room for what you want to learn.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">
              <Flame size={18} />
              {streak}-day overall streak
            </div>
          </div>
          {(storageError || error) && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              {storageError || error}
              {!storageError && (
                <button onClick={() => setError("")} className="ml-3 underline">
                  Dismiss
                </button>
              )}
              {timer && now && now >= timer.endsAt && (
                <button
                  className="ml-3 underline"
                  onClick={() => {
                    void finishTimer(timer.id)
                      .then(() => setError(""))
                      .catch((e) => setError(e.message));
                  }}
                >
                  Retry saving timer
                </button>
              )}
            </div>
          )}
          {reminder && (
            <aside className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
              <p className="text-xs leading-relaxed text-emerald-950">
                <strong>Learn here. Take your progress anywhere, soon.</strong>{" "}
                Sign-in and sync are coming soon. For now, your progress stays
                in this browser. Export a backup to keep a copy.
              </p>
              <button
                onClick={() => void snooze()}
                aria-label="Remind me again in two days"
                className="shrink-0 rounded-lg p-1 text-emerald-700 hover:bg-emerald-100"
              >
                <X size={16} />
              </button>
            </aside>
          )}
          <div className={styles.dashboard}>
            <div className={styles.left}>
              <section
                className={`${styles.panel} ${styles.leader} ${timer ? styles.compact : ""}`}
              >
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                  Most practised
                </p>
                <div
                  className={styles.ring}
                  style={{
                    background: `conic-gradient(#059669 ${share}%,#ecfdf5 0)`,
                  }}
                >
                  <div>
                    <span className="text-3xl font-bold tracking-tight text-emerald-950">
                      {durationLabel(leader?.seconds || 0)}
                    </span>
                    <span className="mt-1 text-xs font-semibold text-neutral-500">
                      learning time
                    </span>
                  </div>
                </div>
                <h2 className="break-words text-2xl font-bold text-emerald-800">
                  {leader?.name || "Your next chapter"}
                </h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-neutral-500">
                  {leader
                    ? `${share}% of your learning time. Keep showing up.`
                    : "Add a skill and log your first session. Your most-practised skill will appear here."}
                </p>
                <div className="mt-auto flex items-center gap-2 pt-5 text-sm font-bold text-emerald-700">
                  <Flame size={17} />
                  {leader
                    ? `${leader.streak}-day skill streak`
                    : "Progress starts with one session"}
                </div>
              </section>
              {timer && now && (
                <Timer
                  timer={timer}
                  name={
                    state.skills.find((s) => s.id === timer.skillId)?.name ||
                    "Focus"
                  }
                  now={now}
                  onError={setError}
                />
              )}
            </div>
            <div className={styles.right}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-neutral-700">
                  Skills I’m learning
                </h2>
                <span className="text-xs font-semibold text-neutral-400">
                  {state.skills.length} / {MAX_SKILLS}
                </span>
              </div>
              <div className={styles.skills}>
                {Array.from({ length: MAX_SKILLS }, (_, slot) => {
                  const skill = stats.find((s) => s.slot === slot);
                  return (
                    <div
                      key={slot}
                      className={`${styles.skill} ${skill ? "" : styles.empty}`}
                    >
                      {skill ? (
                        <>
                          <h3
                            className="truncate text-base font-bold text-emerald-800"
                            title={skill.name}
                          >
                            {skill.name}
                          </h3>
                          <div className="my-1 text-3xl font-bold tracking-tight text-neutral-900">
                            {durationLabel(skill.seconds)}
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-emerald-700">
                              {skill.streak}-day streak
                            </span>
                            <div className="flex items-center gap-1">
                              <SkillResources skill={skill} />
                              <button
                                aria-label={`Log session for ${skill.name}`}
                                onClick={() => setSession(skill.id)}
                                className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-50"
                              >
                                <Plus size={17} />
                              </button>
                            </div>
                          </div>
                        </>
                      ) : editing === slot ? (
                        <SkillComposer
                          slot={slot}
                          onSaved={() => setEditing(null)}
                          onCancel={() => setEditing(null)}
                        />
                      ) : (
                        <button
                          disabled={!canEdit}
                          onClick={() => setEditing(slot)}
                          className="flex h-full min-h-24 w-full flex-col items-center justify-center gap-2 rounded-xl text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-40"
                          aria-label={`Add skill in slot ${slot + 1}`}
                        >
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50">
                            <Plus size={20} />
                          </span>
                          <span className="text-xs font-bold">Add a skill</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {ready && now ? (
                <Heatmap sessions={state.sessions} today={today} />
              ) : (
                <section
                  className={`${styles.panel} ${styles.activity}`}
                  aria-busy="true"
                >
                  <h2 className="text-xl font-bold">Activity</h2>
                  <p className="text-sm text-neutral-400">
                    Loading your learning history…
                  </p>
                </section>
              )}
            </div>
          </div>
        </div>
        <section className="pb-10 pt-8" aria-labelledby="sessions-title">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="sessions-title" className="text-lg font-bold">
              Recent sessions
            </h2>
            <span className="text-xs font-semibold text-neutral-400">
              Saved on this device
            </span>
          </div>
          {!state.sessions.length ? (
            <div className={`${styles.panel} text-sm text-neutral-500`}>
              Your learning sessions will appear here.
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-100">
              {[...state.sessions]
                .sort(
                  (a, b) =>
                    b.activityDate.localeCompare(a.activityDate) ||
                    b.createdAt.localeCompare(a.createdAt),
                )
                .slice(0, 20)
                .map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-5 p-4"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-emerald-900">
                        {state.skills.find((s) => s.id === item.skillId)?.name}
                      </h3>
                      {item.notes && (
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-neutral-500">
                          {item.notes}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-neutral-400">
                        {dateLabel(item.activityDate)},{" "}
                        {item.activityDate.slice(0, 4)} ·{" "}
                        {item.source === "timer"
                          ? "Focus timer"
                          : "Logged time"}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold">
                      {durationLabel(item.durationSeconds)}
                    </span>
                  </li>
                ))}
            </ul>
          )}
          <p className="mt-6 text-center text-xs text-neutral-400">
            Local storage only · No account or cloud sync yet
          </p>
        </section>
      </main>
      {session !== null && (
        <SessionDialog
          state={state}
          selected={session}
          onClose={() => setSession(null)}
        />
      )}
    </div>
  );
}
