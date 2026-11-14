"use client";
import { useState } from "react";
import { addSkill } from "./storage";
import type { Skill } from "./model";
export default function SkillComposer({
  slot,
  onSaved,
  onCancel,
}: {
  slot?: number;
  onSaved: (skill: Skill) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      onSaved(await addSkill(name, slot));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div role="group" aria-label="Add a skill" className="space-y-3">
      <label className="block text-sm font-bold">
        What are you learning?
        <input
          autoFocus
          aria-label="Skill name"
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void save();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }
          }}
          className="mt-2 w-full rounded-lg border border-emerald-200 bg-white p-2 text-neutral-900"
          placeholder="e.g. Spanish"
        />
      </label>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-3 text-sm">
        <button
          type="button"
          disabled={busy || !name.trim()}
          onClick={() => void save()}
          className="rounded-lg bg-emerald-700 px-3 py-2 font-bold text-white disabled:opacity-40"
        >
          Add skill
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
