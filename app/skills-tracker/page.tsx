"use client";
import { useEffect, useRef, useState } from "react";
import { Download, Plus, X } from "lucide-react";
import SkillComposer from "./SkillComposer";
import ThemeToggle from "./ThemeToggle";
import ActivityChart from "./ActivityChart";
import PracticeDonut from "./PracticeDonut";
import StreakFlame from "./StreakFlame";
import SkillResources from "./SkillResources";
import SessionDialog from "./SessionDialog";
import {
  currentStreak,
  PRACTICE_COLORS,
  visibleSkillSlots,
  durationLabel,
  localDay,
  MAX_SKILLS,
  mostPractised,
  REMINDER_INTERVAL,
  skillStats,
  type ActiveTimer,
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
        <span className="text-xs font-semibold text-[var(--tracker-ink)]">
          In focus
        </span>
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
              stroke={
                i / 60 < ratio
                  ? "var(--tracker-action)"
                  : "var(--tracker-chart-empty)"
              }
              strokeWidth="2.5"
            />
          ))}
        </svg>
        <span
          role="timer"
          aria-label={`${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds remaining`}
          className="text-3xl font-bold tabular-nums text-[var(--tracker-ink)]"
        >
          {String(Math.floor(remaining / 60)).padStart(2, "0")}:
          {String(remaining % 60).padStart(2, "0")}
        </span>
      </div>
      <div className="flex justify-center gap-4 text-xs">
        <button
          disabled={busy || elapsed < 60}
          onClick={() => void action(true)}
          className="font-bold text-[var(--tracker-ink)] disabled:opacity-35"
        >
          Finish & save
        </button>
        <button
          disabled={busy}
          onClick={() => void action(false)}
          className="text-[var(--tracker-muted)]"
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
          Skills Tracker<span className="text-[var(--tracker-accent)]">.</span>
        </a>
        <div className={styles.headerActions}>
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
          <ThemeToggle />
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.stage}>
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Hello, learner
                <span className="text-[var(--tracker-accent)]">.</span>
              </h1>
              <p className="mt-1 text-sm font-semibold text-[var(--tracker-muted)]">
                Make a little room for what you want to learn.
              </p>
            </div>
            <div
              aria-live="polite"
              aria-atomic="true"
              className="flex items-center gap-2 rounded-full bg-[var(--tracker-soft)] px-4 py-2 text-sm font-bold text-[var(--tracker-ink)]"
            >
              <StreakFlame count={streak} ready={ready && now !== null} />
              {streak}-day overall streak
            </div>
          </div>
          {(storageError || error) && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-[var(--tracker-line)] bg-[var(--tracker-field)] p-4 text-sm text-[var(--tracker-error)]"
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
            <aside className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-[var(--tracker-line)] bg-[var(--tracker-soft)] px-4 py-3">
              <p className="text-xs leading-relaxed text-[var(--tracker-ink)]">
                <strong>Learn here. Take your progress anywhere, soon.</strong>{" "}
                Sign-in and sync are coming soon. For now, your progress stays
                in this browser. Export a backup to keep a copy.
              </p>
              <button
                onClick={() => void snooze()}
                aria-label="Remind me again in two days"
                className="shrink-0 rounded-lg p-1 text-[var(--tracker-ink)] hover:bg-[var(--tracker-hover)]"
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
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--tracker-muted)]">
                  The most practiced
                </p>
                <PracticeDonut skills={stats} />
                <h2 className="break-words text-2xl font-bold text-[var(--tracker-ink)]">
                  {leader?.name || "Your next chapter"}
                </h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-[var(--tracker-muted)]">
                  {leader
                    ? `${durationLabel(leader.seconds)} · ${share}% of your learning time.`
                    : "Add a skill and log your first session. Your most-practised skill will appear here."}
                </p>
                <div className="mt-auto flex items-center gap-2 pt-5 text-sm font-bold text-[var(--tracker-ink)]">
                  <StreakFlame
                    key={leader?.id ?? "empty"}
                    count={leader?.streak ?? 0}
                    ready={ready && now !== null}
                    size={17}
                  />
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
              <div className="flex items-center justify-end">
                <span className="text-xs font-semibold text-[var(--tracker-muted)]">
                  {state.skills.length} / {MAX_SKILLS}
                </span>
              </div>
              <div className={styles.skills}>
                {visibleSkillSlots(state.skills).map((slot) => {
                  const skill = stats.find((s) => s.slot === slot);
                  return (
                    <div
                      key={slot}
                      className={`${styles.skill} ${skill ? "" : editing === slot ? styles.composerCard : styles.empty}`}
                    >
                      {skill ? (
                        <>
                          <h3
                            className="flex min-w-0 items-center gap-2 text-base font-bold text-[var(--tracker-ink)]"
                            title={skill.name}
                          >
                            <span
                              aria-hidden="true"
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor: `var(--tracker-skill-${skill.slot}, ${PRACTICE_COLORS[skill.slot]})`,
                              }}
                            />
                            <span className="truncate">{skill.name}</span>
                          </h3>
                          <div className="my-1 text-3xl font-bold tracking-tight text-[var(--tracker-ink)]">
                            {durationLabel(skill.seconds)}
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-[var(--tracker-ink)]">
                              {skill.streak}-day streak
                            </span>
                            <div className="flex items-center gap-1">
                              <SkillResources skill={skill} />
                              <button
                                aria-label={`Log session for ${skill.name}`}
                                onClick={() => setSession(skill.id)}
                                className="rounded-lg p-1 text-[var(--tracker-ink)] hover:bg-[var(--tracker-hover)]"
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
                          className={styles.addSkill}
                          aria-label={`Add skill in slot ${slot + 1}`}
                        >
                          <Plus
                            size={56}
                            strokeWidth={5}
                            strokeLinecap="butt"
                            aria-hidden="true"
                          />
                          <span>Add a skill</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {ready && now ? (
                <ActivityChart
                  skills={state.skills}
                  sessions={state.sessions}
                  today={today}
                />
              ) : (
                <section
                  className={`${styles.panel} ${styles.activity}`}
                  aria-busy="true"
                >
                  <h2 className="text-xl font-bold">Activity</h2>
                  <p className="text-sm text-[var(--tracker-muted)]">
                    Loading your learning history…
                  </p>
                </section>
              )}
            </div>
          </div>
        </div>
        <section className="pb-10 pt-6" aria-labelledby="sessions-title">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="sessions-title" className="text-lg font-bold">
              Recent sessions
            </h2>
            <span className="text-xs font-semibold text-[var(--tracker-muted)]">
              Saved on this device
            </span>
          </div>
          {!state.sessions.length ? (
            <div
              className={`${styles.panel} text-sm text-[var(--tracker-muted)]`}
            >
              Your learning sessions will appear here.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--tracker-line)] rounded-2xl border border-[var(--tracker-line)]">
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
                      <h3 className="text-sm font-bold text-[var(--tracker-ink)]">
                        {state.skills.find((s) => s.id === item.skillId)?.name}
                      </h3>
                      {item.notes && (
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-[var(--tracker-muted)]">
                          {item.notes}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-[var(--tracker-muted)]">
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
          <p className="mt-6 text-center text-xs text-[var(--tracker-muted)]">
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
