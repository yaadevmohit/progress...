"use client";
import { useState, type FormEvent } from "react";
import { GitBranch, Pencil, Plus, Trash2, X } from "lucide-react";
import { deactivateSkill, moveSkill, updateSkill, useTracker } from "./storage";
import { activeSkills, isActiveSkill, skillTrail, subtreeIds, type LearningResource, type Skill } from "./model";
import TrackerModal from "./TrackerModal";
import styles from "./tracker.module.css";
export default function SkillActions({
  skill,
  onRemoved,
  inline = false,
}: {
  skill: Skill;
  onRemoved?: () => void;
  inline?: boolean;
}) {
  const [mode, setMode] = useState<"edit" | "remove" | "move" | null>(null);
  if (skill.status === "deleted") return null;
  return (
    <>
      <div
        className={`${styles.skillActions} ${inline ? styles.inlineActions : ""}`}
      >
        <button
          type="button"
          onClick={() => setMode("edit")}
          aria-label={`Edit ${skill.name}`}
          title="Edit skill"
          className={styles.skillAction}
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          onClick={() => setMode("remove")}
          aria-label={`Remove ${skill.name}`}
          title="No longer learning this skill?"
          className={styles.skillAction}
        >
          <Trash2 size={15} />
        </button>
      </div>
      {mode === "edit" && (
        <EditSkill skill={skill} onClose={() => setMode(null)} onMove={() => setMode("move")} />
      )}{" "}
      {mode === "move" && <MoveSkill skill={skill} onClose={() => setMode(null)} />}
      {mode === "remove" && (
        <RemoveSkill
          skill={skill}
          onClose={() => setMode(null)}
          onRemoved={onRemoved}
        />
      )}
    </>
  );
}
function EditSkill({ skill, onClose, onMove }: { skill: Skill; onClose: () => void; onMove: () => void }) {
  const [name, setName] = useState(skill.name),
    [description, setDescription] = useState(skill.description ?? ""),
    [resources, setResources] = useState<LearningResource[]>(
      skill.resources ?? [],
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function change(id: string, key: "name" | "url", value: string) {
    setResources((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    );
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await updateSkill(skill.id, name, description, resources);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <TrackerModal title="Edit skill" onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-bold">
          Name
          <input
            autoFocus
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.input}
          />
        </label>
        <label className="block text-sm font-bold">
          Description <span className="font-normal">(optional)</span>
          <textarea
            rows={3}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={styles.input}
          />
        </label>
        {isActiveSkill(skill) && <button type="button" onClick={onMove}
          className="flex items-center gap-2 text-sm font-bold underline underline-offset-4">
          <GitBranch size={16} aria-hidden="true" />
          {skill.parentId ? "Move to another parent skill" : "Move under another skill"}
        </button>}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold">Resources</h3>
            <button
              type="button"
              onClick={() =>
                setResources((rows) => [
                  ...rows,
                  { id: crypto.randomUUID(), name: "", url: "" },
                ])
              }
              className="flex items-center gap-1 rounded-lg p-2 text-xs font-bold hover:bg-[var(--tracker-hover)]"
            >
              <Plus size={14} />
              Add resource
            </button>
          </div>
          <div className="space-y-3">
            {resources.map((resource, index) => (
              <div
                key={resource.id}
                className="relative rounded-xl border border-[var(--tracker-line)] p-3 pr-10"
              >
                <button
                  type="button"
                  onClick={() =>
                    setResources((rows) =>
                      rows.filter((row) => row.id !== resource.id),
                    )
                  }
                  aria-label={`Remove resource ${index + 1}`}
                  className="absolute top-2 right-2 rounded-lg p-1 hover:bg-[var(--tracker-hover)]"
                >
                  <X size={15} />
                </button>
                <label className="block text-xs font-bold">
                  Resource name
                  <input
                    aria-label={`Resource ${index + 1} name`}
                    maxLength={100}
                    required={!!resource.url.trim()}
                    value={resource.name}
                    onChange={(e) =>
                      change(resource.id, "name", e.target.value)
                    }
                    className={styles.input}
                  />
                </label>
                <label className="mt-2 block text-xs font-bold">
                  Link
                  <input
                    aria-label={`Resource ${index + 1} link`}
                    type="url"
                    maxLength={2048}
                    required={!!resource.name.trim()}
                    value={resource.url}
                    onChange={(e) => change(resource.id, "url", e.target.value)}
                    className={styles.input}
                  />
                </label>
              </div>
            ))}
          </div>
          {!resources.length && (
            <p className="text-sm text-[var(--tracker-muted)]">
              No resources added.
            </p>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-[var(--tracker-error)]">
            {error}
          </p>
        )}
        <button disabled={busy} className={styles.actionButton}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </form>
    </TrackerModal>
  );
}
function RemoveSkill({
  skill,
  onClose,
  onRemoved,
}: {
  skill: Skill;
  onClose: () => void;
  onRemoved?: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function remove(status: "archived" | "deleted") {
    if (busy) return;
    setBusy(true);
    try {
      await deactivateSkill(skill.id, status);
      onRemoved?.();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <TrackerModal
      title="No longer learning this skill?"
      onClose={onClose}
      busy={busy}
    >
      <p className="mb-3 font-bold">{skill.name}</p>
      <p className="text-sm leading-relaxed text-[var(--tracker-muted)]">
        Archiving keeps this skill, its subskills, sessions, and progress for later.
        Deleting permanently removes this skill and all its subskills, resources,
        sessions, and practice time. Totals, streaks, and charts will be recalculated.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-[var(--tracker-error)]">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        {skill.status !== "archived" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void remove("archived")}
            className={styles.actionButton}
          >
            Archive skill
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => void remove("deleted")}
          className="rounded-xl border border-[var(--tracker-line)] px-4 py-3 text-sm font-bold text-[var(--tracker-error)]"
        >
          Delete skill and history
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="px-2 text-sm font-bold"
        >
          Keep it
        </button>
      </div>
    </TrackerModal>
  );
}

function MoveSkill({ skill, onClose }: { skill: Skill; onClose: () => void }) {
  const { state, error: storageError } = useTracker();
  const excluded = subtreeIds(state.skills, skill.id);
  const parents = activeSkills(state.skills).filter((parent) => !excluded.has(parent.id) && parent.id !== skill.parentId);
  const [parentId, setParentId] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try { await moveSkill(skill.id, parentId); onClose(); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <TrackerModal title="Move skill" onClose={onClose} busy={busy}>
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-[var(--tracker-muted)]">Move {skill.name} and its subskills under another skill. Sessions, resources, and practice time stay attached. The new parent’s totals will include this skill’s practice.</p>
      <label className="block text-sm font-bold">Parent skill
        <select required value={parentId} onChange={(event) => setParentId(event.target.value)} className={styles.input}>
          <option value="">Choose a parent skill</option>
          {parents.map((parent) => <option key={parent.id} value={parent.id}>{skillTrail(state.skills, parent.id).map((s) => s.name).join(" / ")}</option>)}
        </select>
      </label>
      {!parents.length && <p className="text-sm text-[var(--tracker-muted)]">Add another main skill first. A skill cannot be moved into its own subskills.</p>}
      {(error || storageError) && <p role="alert" className="text-sm text-[var(--tracker-error)]">{error || storageError}</p>}
      <button disabled={busy || !parentId || !!storageError} className={styles.actionButton}>{busy ? "Moving…" : "Move skill"}</button>
    </form>
  </TrackerModal>;
}
