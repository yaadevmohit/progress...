"use client";
import { useState } from "react";
import { addSkill } from "./storage";
import type { Skill } from "./model";
export default function SkillComposer({
  slot,
  parentId,
  onSaved,
  onCancel,
}: {
  slot?: number;
  parentId?: string;
  onSaved: (skill: Skill) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      onSaved(await addSkill(name, slot, description, parentId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      role="group"
      aria-label={parentId ? "Add a subskill" : "Add a skill"}
      className="space-y-3"
    >
      <label className="block text-sm font-bold">
        What are you learning?
        <input
          autoFocus
          aria-label={parentId ? "Subskill name" : "Skill name"}
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
          className="mt-2 w-full rounded-lg border border-[var(--tracker-line)] bg-[var(--tracker-field)] p-2 text-[var(--tracker-ink)]"
          placeholder={parentId ? "e.g. Conversation" : "e.g. Spanish"}
        />
      </label>
      <label className="block text-xs font-bold">
        Description (optional)
        <textarea
          rows={2}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-2 w-full rounded-lg border border-[var(--tracker-line)] bg-[var(--tracker-field)] p-2 text-[var(--tracker-ink)]"
        />
      </label>
      {error && (
        <p role="alert" className="text-xs text-[var(--tracker-error)]">
          {error}
        </p>
      )}
      <div className="flex gap-3 text-sm">
        <button
          type="button"
          disabled={busy || !name.trim()}
          onClick={() => void save()}
          className="rounded-lg bg-[var(--tracker-action)] px-3 py-2 font-bold text-[var(--tracker-on-action)] disabled:opacity-40"
        >
          {parentId ? "Add subskill" : "Add skill"}
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
