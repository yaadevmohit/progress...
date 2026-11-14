"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import DurationDial from "../ui/components/DurationDial";
import SkillComposer from "./SkillComposer";
import { localDay, type TrackerState } from "./model";
import { logSession, startTimer } from "./storage";
import styles from "./tracker.module.css";
export default function SessionDialog({
  state,
  selected,
  onClose,
}: {
  state: TrackerState;
  selected: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    picker = useRef<HTMLDetailsElement>(null);
  const [skillId, setSkillId] = useState(selected || state.skills[0]?.id || ""),
    [adding, setAdding] = useState(!state.skills.length),
    [minutes, setMinutes] = useState(25),
    [mode, setMode] = useState<"recorded" | "timer">("recorded"),
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
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      if (mode === "timer")
        await startTimer(skillId, minutes, String(data.get("notes") || ""));
      else
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
            className="rounded-lg p-2 hover:bg-neutral-100"
          >
            <X size={20} />
          </button>
        </div>
        <div
          className="mx-auto mb-5 flex w-fit rounded-full bg-emerald-50 p-1"
          aria-label="Session type"
        >
          {(["recorded", "timer"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`rounded-full px-5 py-2 text-sm font-bold transition-colors ${mode === value ? "bg-emerald-700 text-white" : "text-emerald-900"}`}
            >
              {value === "recorded" ? "Log time" : "Focus timer"}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <span className="mb-2 block text-sm font-bold">Skill</span>
            <details ref={picker} className="relative">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 text-sm">
                {state.skills.find((s) => s.id === skillId)?.name ||
                  "Choose a skill"}
                <ChevronDown size={17} />
              </summary>
              <div className="absolute z-10 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-emerald-100 bg-white p-2 shadow-lg">
                {state.skills.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    aria-pressed={skill.id === skillId}
                    onClick={() => {
                      setSkillId(skill.id);
                      picker.current?.removeAttribute("open");
                      picker.current?.querySelector("summary")?.focus();
                    }}
                    className="block w-full rounded-lg p-3 text-left text-sm hover:bg-emerald-50"
                  >
                    {skill.name}
                  </button>
                ))}
                {state.skills.length < 6 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(true);
                      picker.current?.removeAttribute("open");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg p-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
                  >
                    <Plus size={16} />
                    Add a new skill
                  </button>
                ) : (
                  <p className="p-3 text-xs text-neutral-500">
                    All six skill slots are in use.
                  </p>
                )}
              </div>
            </details>
          </div>
          {adding && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
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
            <span className="block text-sm font-bold">Duration</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[25, 45, 60].map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={minutes === value}
                  onClick={() => setMinutes(value)}
                  className={`rounded-xl border p-2 text-sm font-bold transition-colors ${minutes === value ? "border-emerald-700 bg-emerald-700 text-white" : "border-emerald-100 text-emerald-900"}`}
                >
                  {value} min
                </button>
              ))}
            </div>
            <DurationDial minutes={minutes} onChange={setMinutes} />
          </div>
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
            <span className="font-normal text-neutral-500">(optional)</span>
            <textarea
              name="notes"
              maxLength={2000}
              rows={2}
              className={styles.input}
              placeholder="What did you work on?"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          {mode === "timer" && state.activeTimer && (
            <p className="text-sm text-emerald-800">
              Finish or cancel your active timer before starting another.
            </p>
          )}
          <button
            disabled={
              busy ||
              adding ||
              !skillId ||
              (mode === "timer" && !!state.activeTimer)
            }
            className="w-full rounded-xl bg-emerald-700 p-3 font-bold text-white disabled:opacity-40"
          >
            {busy
              ? "Saving…"
              : mode === "timer"
                ? "Start timer"
                : "Save session"}
          </button>
        </form>
      </div>
    </dialog>
  );
}
