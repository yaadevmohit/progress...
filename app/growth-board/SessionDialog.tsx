"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import DurationDial from "../ui/components/DurationDial";
import SkillComposer from "./SkillComposer";
import {
  rootSkills,
  skillTrail,
  activeSkills,
  localDay,
  type TrackerState,
} from "./model";
import { playSessionAlert, unlockSessionAudio } from "./session-alert";
import { logSession, startTimer } from "./storage";
import styles from "./tracker.module.css";
export default function SessionDialog({
  state,
  selected,
  onClose,
  onStarted,
}: {
  state: TrackerState;
  selected: string;
  onClose: () => void;
  onStarted: (name: string, minutes: number) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    picker = useRef<HTMLDetailsElement>(null);
  const available = activeSkills(state.skills);
  const [skillId, setSkillId] = useState(selected || available[0]?.id || ""),
    [adding, setAdding] = useState(!available.length),
    [minutes, setMinutes] = useState(25),
    [mode, setMode] = useState<"recorded" | "timer" | "pomodoro">("recorded"),
    [breaks, setBreaks] = useState(3),
    [breakMinutes, setBreakMinutes] = useState(5),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      node?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (mode !== "recorded") unlockSessionAudio();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      if (mode !== "recorded") {
        await startTimer(skillId, minutes, String(data.get("notes") || ""), mode === "pomodoro" ? { breaks, breakMinutes } : undefined);
        playSessionAlert("start");
        onStarted(
          state.skills.find((skill) => skill.id === skillId)?.name || "Focus",
          minutes,
        );
      } else
        await logSession(
          skillId,
          minutes,
          String(data.get("date")),
          String(data.get("notes") || ""),
        );
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="session-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={styles.dialog}
    >
      <div className="p-6 sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="session-title" className="text-2xl font-bold">
            Log a session
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close session form"
            className="rounded-lg p-2 hover:bg-[var(--tracker-hover)]"
          >
            <X size={20} />
          </button>
        </div>
        <div
          className="mx-auto mb-5 flex w-fit rounded-full bg-[var(--tracker-soft)] p-1"
          aria-label="Session type"
        >
          {(["recorded", "timer", "pomodoro"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`rounded-full px-3 py-2 text-sm font-bold transition-colors ${mode === value ? "bg-[var(--tracker-action)] text-[var(--tracker-on-action)]" : "text-[var(--tracker-ink)]"}`}
            >
              {value === "recorded" ? "Log time" : value === "timer" ? "Focus timer" : "Pomodoro"}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <span className="mb-2 block text-sm font-bold">Skill</span>
            <details ref={picker} className="relative">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-[var(--tracker-line)] bg-[var(--tracker-soft)] p-3 text-sm">
                {skillTrail(state.skills, skillId)
                  .map((s) => s.name)
                  .join(" / ") || "Choose a skill"}
                <ChevronDown size={17} />
              </summary>
              <div className="absolute z-10 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-[var(--tracker-line)] bg-[var(--tracker-field)] p-2 shadow-lg">
                {available.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    aria-pressed={skill.id === skillId}
                    onClick={() => {
                      setSkillId(skill.id);
                      picker.current?.removeAttribute("open");
                      picker.current?.querySelector("summary")?.focus();
                    }}
                    className="block w-full rounded-lg p-3 text-left text-sm hover:bg-[var(--tracker-hover)]"
                  >
                    {skillTrail(state.skills, skill.id)
                      .map((s) => s.name)
                      .join(" / ")}
                  </button>
                ))}
                {rootSkills(available).length < 6 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(true);
                      picker.current?.removeAttribute("open");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg p-3 text-sm font-bold text-[var(--tracker-ink)] hover:bg-[var(--tracker-hover)]"
                  >
                    <Plus size={16} />
                    Add a new skill
                  </button>
                ) : (
                  <p className="p-3 text-xs text-[var(--tracker-muted)]">
                    All six skill slots are in use.
                  </p>
                )}
              </div>
            </details>
          </div>
          {adding && (
            <div className="rounded-xl border border-[var(--tracker-line)] bg-[var(--tracker-soft)] p-4">
              <SkillComposer
                onCancel={() => setAdding(false)}
                onSaved={(skill) => {
                  setSkillId(skill.id);
                  setAdding(false);
                }}
              />
            </div>
          )}
          <div>
            <span className="block text-sm font-bold">{mode === "pomodoro" ? "Total focus duration (breaks excluded)" : "Duration"}</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[25, 45, 60].map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={minutes === value}
                  onClick={() => setMinutes(value)}
                  className={`rounded-xl border p-2 text-sm font-bold transition-colors ${minutes === value ? "border-[var(--tracker-line)] bg-[var(--tracker-action)] text-[var(--tracker-on-action)]" : "border-[var(--tracker-line)] text-[var(--tracker-ink)]"}`}
                >
                  {value} min
                </button>
              ))}
            </div>
            <div className={styles.durationDial}>
              <DurationDial minutes={minutes} onChange={setMinutes} />
            </div>
          </div>
          {mode === "pomodoro" && (
            <fieldset className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-bold">Number of breaks
                  <input type="number" min={1} max={Math.min(24, minutes - 1)} step={1} required value={breaks} onChange={(e) => setBreaks(Number(e.target.value))} className={styles.input} />
                </label>
                <label className="text-sm font-bold">Break duration (min)
                  <input type="number" min={1} max={60} step={1} required value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value))} className={styles.input} />
                </label>
              </div>
              <p className="text-xs text-[var(--tracker-muted)]">{minutes} min focus + {breaks * breakMinutes} min breaks = {minutes + breaks * breakMinutes} min total. {breaks + 1} focus blocks, saved individually when each finishes. Ending early keeps completed blocks.</p>
            </fieldset>
          )}
          {mode === "recorded" && (
            <label className="block text-sm font-bold">
              Date
              <input
                name="date"
                type="date"
                required
                defaultValue={localDay()}
                max={localDay()}
                className={styles.input}
              />
            </label>
          )}
          <label className="block text-sm font-bold">
            Description{" "}
            <span className="font-normal text-[var(--tracker-muted)]">
              (optional)
            </span>
            <textarea
              name="notes"
              maxLength={2000}
              rows={2}
              className={styles.input}
              placeholder={
                mode !== "recorded"
                  ? "What are you working on today?"
                  : "What did you work on?"
              }
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-[var(--tracker-error)]">
              {error}
            </p>
          )}
          {mode !== "recorded" && state.activeTimer && (
            <p className="text-sm text-[var(--tracker-ink)]">
              Finish or cancel your active timer before starting another.
            </p>
          )}
          <button
            disabled={
              busy ||
              adding ||
              !skillId ||
              (mode !== "recorded" && !!state.activeTimer)
            }
            className="w-full rounded-xl bg-[var(--tracker-action)] p-3 font-bold text-[var(--tracker-on-action)] disabled:opacity-40"
          >
            {busy
              ? "Saving…"
              : mode !== "recorded"
                ? "Start timer"
                : "Save session"}
          </button>
        </form>
      </div>
    </dialog>
  );
}
