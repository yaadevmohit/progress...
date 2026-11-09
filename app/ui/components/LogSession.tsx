"use client";

import { Check, ChevronDown, Plus } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import DurationDial, { MINUTES_MAX } from "./DurationDial";
import { TIMER_REVEAL_DELAY_MS, useSessionTimer } from "./SessionTimerContext";
import { HOBBIES, type Hobby } from "../mock-data";
import { saveSession } from "../session-log";

const FIELD_CLASS = "w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900";

async function playTimerChime() {
  let context: AudioContext | undefined;
  try {
    context = new AudioContext();
    if (context.state === "suspended") await context.resume();

    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : TIMER_REVEAL_DELAY_MS;
    const start = context.currentTime + delay / 1_000;
    const tone = context.createOscillator();
    const volume = context.createGain();
    tone.type = "sine";
    tone.frequency.setValueAtTime(660, start);
    tone.frequency.setValueAtTime(880, start + 0.085);
    volume.gain.setValueAtTime(0.001, start);
    volume.gain.exponentialRampToValueAtTime(0.07, start + 0.025);
    volume.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
    tone.connect(volume).connect(context.destination);
    tone.onended = () => { void context?.close().catch(() => {}); };
    tone.start(start);
    tone.stop(start + 0.25);
  } catch {
    void context?.close().catch(() => {});
  }
}

export default function LogSession() {
  const dialog = useRef<HTMLDialogElement>(null);
  const hobbyPicker = useRef<HTMLDetailsElement>(null);
  const hobbyTrigger = useRef<HTMLElement>(null);
  const [hobby, setHobby] = useState<Hobby | null>(null);
  const [minutes, setMinutes] = useState(25);
  const [mode, setMode] = useState<"past" | "timer">("past");
  const { active, setActive } = useSessionTimer();
  const [error, setError] = useState("");

  function closeHobbyPicker() {
    hobbyPicker.current?.removeAttribute("open");
    hobbyTrigger.current?.focus();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    if (!hobby) {
      setError("Choose a hobby before continuing.");
      hobbyTrigger.current?.focus();
      return;
    }
    if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > MINUTES_MAX) {
      setError("Enter a valid duration in whole minutes.");
      return;
    }

    const notes = String(fields.get("description") ?? "").trim();
    if (mode === "timer") {
      if (active) {
        setError("Finish or cancel the current timer before starting another.");
        return;
      }
      setActive({ hobby, minutes, notes, endsAt: Date.now() + minutes * 60_000 });
      void playTimerChime();
    } else {
      try {
        saveSession(hobby, minutes, notes);
      } catch {
        setError("Couldn’t save this session in this browser. Please try again.");
        return;
      }
    }

    dialog.current?.close();
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
        className="group flex cursor-pointer items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm shadow-emerald-600/10 transition-all hover:bg-emerald-700 active:scale-95"
      >
        <Plus size={16} strokeWidth={2.5} aria-hidden="true" className="transition-transform duration-300 group-hover:rotate-90" />
        Log Session
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="log-session-title"
        onClose={() => {
          dialog.current?.querySelector("form")?.reset();
          hobbyPicker.current?.removeAttribute("open");
          setHobby(null);
          setMinutes(25);
          setMode("past");
          setError("");
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 text-neutral-900 shadow-xl backdrop:bg-black/45 sm:p-6 motion-safe:open:animate-[panel-enter_220ms_ease-out_both]"
      >
        <h2 id="log-session-title" className="sr-only">Log a session</h2>
        <div role="group" aria-label="Session mode" className="relative isolate mx-auto grid w-fit grid-cols-2 rounded-xl bg-emerald-50 p-1">
          <span aria-hidden="true" className={`absolute inset-y-1 left-1 -z-10 w-[calc(50%-0.25rem)] rounded-lg bg-emerald-700 motion-safe:transition-transform motion-safe:duration-200 ${mode === "timer" ? "translate-x-full" : ""}`} />
          {(["past", "timer"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              onClick={() => {
                setMode(option);
                setError("");
              }}
              className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap text-emerald-900 aria-pressed:text-white motion-safe:transition-colors"
            >
              {option === "past" ? "Log past" : "Start timer"}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <span id="session-name-label" className="block text-sm font-semibold">Session name</span>
            <details
              ref={hobbyPicker}
              className="group relative z-10"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape" && event.currentTarget.open) {
                  event.preventDefault();
                  event.stopPropagation();
                  closeHobbyPicker();
                }
              }}
            >
              <summary
                ref={hobbyTrigger}
                aria-labelledby="session-name-label session-hobby-value"
                className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm hover:border-emerald-500 focus-visible:outline-2 focus-visible:outline-emerald-700 group-open:border-emerald-600 [&::-webkit-details-marker]:hidden"
              >
                <span id="session-hobby-value" className={hobby ? "font-medium text-neutral-900" : "text-neutral-500"}>
                  {hobby ?? "Choose a hobby"}
                </span>
                <ChevronDown aria-hidden="true" size={16} className="text-emerald-700 group-open:rotate-180 motion-safe:transition-transform" />
              </summary>
              <div role="group" aria-label="Hobbies" className="absolute inset-x-0 top-full mt-1 grid gap-0.5 rounded-xl border border-emerald-100 bg-white p-1 shadow-lg motion-safe:animate-[panel-enter_150ms_ease-out_both]">
                {(Object.keys(HOBBIES) as Hobby[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={hobby === option}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setHobby(option);
                      setError("");
                      closeHobbyPicker();
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-neutral-700 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-700 aria-pressed:bg-emerald-50 aria-pressed:font-semibold aria-pressed:text-emerald-900"
                  >
                    <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: HOBBIES[option] }} />
                    {option}
                    {hobby === option && <Check aria-hidden="true" size={15} className="ml-auto text-emerald-700" />}
                  </button>
                ))}
              </div>
            </details>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Duration</legend>
            <div className="grid grid-cols-3 gap-2">
              {[25, 45, 60].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={minutes === preset}
                  onClick={() => setMinutes(preset)}
                  className="cursor-pointer rounded-xl border border-neutral-300 px-2 py-2 text-sm aria-pressed:border-emerald-600 aria-pressed:bg-emerald-50 aria-pressed:text-emerald-800 motion-safe:transition-colors"
                >
                  {preset} min
                </button>
              ))}
            </div>
            <DurationDial minutes={minutes} onChange={setMinutes} />
          </fieldset>

          <label className="block space-y-1.5 text-sm font-semibold">
            <span>Description <span className="font-normal text-neutral-500">(optional)</span></span>
            <textarea name="description" rows={3} placeholder="What did you practice?" className={FIELD_CLASS} />
          </label>

          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => dialog.current?.close()} className="cursor-pointer rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold hover:bg-neutral-50">
              Cancel
            </button>
            <button type="submit" className="cursor-pointer rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
              {mode === "timer" ? "Start session" : "Save session"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
