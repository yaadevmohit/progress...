"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Plus, X } from "lucide-react";
import SkillComposer from "./SkillComposer";
import SkillDetail from "./SkillDetail";
import ThemeToggle from "./ThemeToggle";
import ActivityChart from "./ActivityChart";
import PracticeDonut from "./PracticeDonut";
import StreakFlame from "./StreakFlame";
import SkillResources from "./SkillResources";
import SessionDialog from "./SessionDialog";
import {
  currentStreak,
  PRACTICE_COLORS,
  SKILL_TEXT_COLORS,
  visibleSkillSlots,
  durationLabel,
  localDay,
  MAX_SKILLS,
  mostPractised,
  mostRecentSession,
  focusSkill,
  REMINDER_INTERVAL,
  skillStats,
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
import { playSessionAlert } from "./session-alert";
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
  onFinish,
}: {
  timer: ActiveTimer;
  name: string;
  now: number;
  onError: (message: string) => void;
  onFinish: (id: string, early?: boolean) => Promise<void>;
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
      if (finish) await onFinish(timer.id, true);
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
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [completed, setCompleted] = useState<LearningSession | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const attemptedTimer = useRef<string | null>(null);
  const stats = skillStats(state, today),
    leader = mostPractised(state, today),
    streak = currentStreak(state.sessions, today),
    total = stats.reduce((sum, s) => sum + s.seconds, 0),
    share = leader ? Math.round((leader.seconds / total) * 100) : 0;
  const focused = selectedId ? focusSkill(state, selectedId, today) : null;
  const selectedSkill = focused?.skill ?? null;
  const activitySessions = focused?.sessions ?? state.sessions;
  const latestSession = mostRecentSession(state.sessions);
  const latestSkill = state.skills.find(
    (skill) => skill.id === latestSession?.skillId,
  );
  const timer = state.activeTimer;
  const completeTimer = useCallback(
    async (id: string, early = false) => {
      const saved = await finishTimer(id, early);
      if (saved) {
        setCompleted(saved);
        setNotice("");
        setError("");
        playSessionAlert("finish");
      }
    },
    [setCompleted, setNotice, setError],
  );
  useEffect(() => {
    const originalTitle = document.title;
    return () => {
      document.title = originalTitle;
    };
  }, []);
  useEffect(() => {
    if (timer && now !== null) {
      const seconds = Math.min(
        timer.minutes * 60,
        Math.max(0, Math.ceil((timer.endsAt - now) / 1000)),
      );
      const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
      document.title = `${countdown} · Skills Tracker`;
    } else {
      document.title = completed
        ? "Session complete · Skills Tracker"
        : "Skills Tracker";
    }
  }, [timer, now, completed]);
  useEffect(() => {
    if (
      !timer ||
      !now ||
      now < timer.endsAt ||
      attemptedTimer.current === timer.id
    )
      return;
    attemptedTimer.current = timer.id;
    void completeTimer(timer.id).catch((e) => setError((e as Error).message));
  }, [timer, now, completeTimer]);
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
                    void completeTimer(timer.id)
                      .then(() => setError(""))
                      .catch((e) => setError(e.message));
                  }}
                >
                  Retry saving timer
                </button>
              )}
            </div>
          )}
          <div role="status" aria-live="polite" aria-atomic="true">
            {notice && (
              <div className={styles.sessionNotice}>
                <p>{notice}</p>
                <button
                  className={styles.icon}
                  onClick={() => setNotice("")}
                  aria-label="Dismiss session alert"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
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
                className={`${styles.panel} ${styles.leader} ${timer || completed ? styles.compact : ""}`}
              >
                <PracticeDonut
                  skills={stats}
                  selectedId={selectedSkill?.id ?? null}
                  onSelect={setSelectedId}
                />
                <div className={styles.leaderHeading}>
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--tracker-muted)]">
                    The most practiced
                  </p>
                  <h2 className="mt-2 break-words text-2xl font-bold text-[var(--tracker-ink)]">
                    {leader?.name || "Your next chapter"}
                  </h2>
                </div>
                <p
                  className={`${styles.leaderIntro} mt-2 text-sm font-semibold leading-relaxed text-[var(--tracker-muted)]`}
                >
                  {leader
                    ? `${durationLabel(leader.seconds)} · ${share}% of your learning time.`
                    : "Add a skill and log your first session. Your most-practised skill will appear here."}
                </p>
                <div className={styles.leaderDetails}>
                  <div className={styles.latestSession}>
                    <p className="text-xs font-bold text-[var(--tracker-muted)]">
                      Latest session
                    </p>
                    {latestSession ? (
                      <>
                        <p className="mt-1 break-words text-sm font-bold">
                          {latestSkill?.name}{" "}
                          <span className="text-[var(--tracker-muted)]">·</span>{" "}
                          {durationLabel(latestSession.durationSeconds)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--tracker-muted)]">
                          {dateLabel(latestSession.activityDate)},{" "}
                          {latestSession.activityDate.slice(0, 4)}
                        </p>
                        {latestSession.notes && (
                          <p
                            className={`${styles.sessionNotes} mt-1 line-clamp-2 break-words text-xs text-[var(--tracker-muted)]`}
                          >
                            {latestSession.notes}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-[var(--tracker-muted)]">
                        Your first session will appear here.
                      </p>
                    )}
                  </div>
                  <div className={styles.streakStats}>
                    <div
                      aria-live="polite"
                      aria-atomic="true"
                      className={styles.streakStat}
                    >
                      <StreakFlame
                        count={streak}
                        ready={ready && now !== null}
                        celebrateDay={today}
                        size={20}
                      />
                      <div>
                        <strong>
                          {streak} {streak === 1 ? "day" : "days"}
                        </strong>
                        <span>Overall streak</span>
                      </div>
                    </div>
                  </div>
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
                  onFinish={completeTimer}
                />
              )}
              {!timer && completed && (
                <section
                  className={`${styles.panel} ${styles.completion}`}
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  aria-labelledby="completion-title"
                >
                  <button
                    className={`${styles.icon} ${styles.completionClose}`}
                    onClick={() => setCompleted(null)}
                    aria-label="Dismiss session completion"
                  >
                    <X size={18} />
                  </button>
                  <CheckCircle2
                    size={32}
                    aria-hidden="true"
                    className="mb-3 text-[var(--tracker-action)]"
                  />
                  <h2 id="completion-title" className="text-xl font-bold">
                    Thank you for showing up!
                  </h2>
                  <p className="mt-3 text-sm font-semibold">
                    Your {durationLabel(completed.durationSeconds)} session for{" "}
                    {state.skills.find(
                      (skill) => skill.id === completed.skillId,
                    )?.name || "your skill"}{" "}
                    is finished and saved.
                  </p>
                  <p className="mt-2 text-sm text-[var(--tracker-muted)]">
                    Every session moves you forward. Keep going, one small step
                    at a time.
                  </p>
                </section>
              )}
            </div>
            <div className={styles.right}>
              {selectedSkill ? (
                <SkillDetail
                  skill={selectedSkill}
                  sessions={activitySessions}
                  onBack={() => setSelectedId(null)}
                  onLog={() => setSession(selectedSkill.id)}
                />
              ) : (
                <>
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
                          className={`${styles.skill} ${skill ? styles.learnedSkill : editing === slot ? styles.composerCard : styles.empty}`}
                          style={
                            skill
                              ? {
                                  backgroundColor: PRACTICE_COLORS[slot],
                                  color: SKILL_TEXT_COLORS[slot],
                                }
                              : undefined
                          }
                          data-ink={
                            skill && (slot === 2 || slot === 5)
                              ? "dark"
                              : "light"
                          }
                        >
                          {skill ? (
                            <>
                              <h3
                                className="truncate text-base font-bold"
                                title={skill.name}
                              >
                                {skill.name}
                              </h3>
                              <div className="my-1 text-3xl font-bold tracking-tight">
                                {durationLabel(skill.seconds)}
                              </div>
                              <div className={styles.skillFooter}>
                                <span className={styles.skillStreak}>
                                  <StreakFlame
                                    count={skill.streak}
                                    ready={ready && now !== null}
                                    size={14}
                                  />
                                  {skill.streak}-day streak
                                </span>
                                <div className={styles.skillFooterActions}>
                                  <SkillResources skill={skill} />
                                  <button
                                    aria-label={`Log session for ${skill.name}`}
                                    onClick={() => setSession(skill.id)}
                                    className={`${styles.skillAction} rounded-lg p-1`}
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
                </>
              )}
              {ready && now ? (
                <ActivityChart
                  skills={selectedSkill ? [selectedSkill] : state.skills}
                  sessions={activitySessions}
                  today={today}
                  skillName={selectedSkill?.name}
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
        {!selectedSkill && (
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
                          {
                            state.skills.find((s) => s.id === item.skillId)
                              ?.name
                          }
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
        )}
      </main>
      {session !== null && (
        <SessionDialog
          onStarted={(name, minutes) => {
            setCompleted(null);
            setNotice(
              `${name} timer started. You have ${minutes} ${minutes === 1 ? "minute" : "minutes"} to focus. You’ve got this!`,
            );
            playSessionAlert("start");
          }}
          state={state}
          selected={session}
          onClose={() => setSession(null)}
        />
      )}
    </div>
  );
}
