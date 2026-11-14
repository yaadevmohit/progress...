"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ExternalLink, Plus, Trash2, X } from "lucide-react";
import type { Skill } from "./model";
import { addResource, removeResource } from "./storage";
import styles from "./tracker.module.css";

export default function SkillResources({ skill }: { skill: Skill }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`Resources for ${skill.name}`}
        onClick={() => setOpen(true)}
        className={`${styles.resourceTrigger} rounded-lg px-1 py-1 text-[11px] font-bold`}
      >
        Resources{skill.resources?.length ? ` · ${skill.resources.length}` : ""}
      </button>
      {open && <ResourcesDialog skill={skill} onClose={() => setOpen(false)} />}
    </>
  );
}
function ResourcesDialog({
  skill,
  onClose,
}: {
  skill: Skill;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    nameInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(""),
    [url, setUrl] = useState(""),
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
    try {
      await addResource(skill.id, name, url);
      setName("");
      setUrl("");
      nameInput.current?.focus();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    setError("");
    try {
      await removeResource(skill.id, id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby={`resources-${skill.id}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={styles.dialog}
    >
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id={`resources-${skill.id}`}
              className="text-2xl font-extrabold"
            >
              Learning resources
            </h2>
            <p className="mt-1 break-words text-sm font-bold text-[var(--tracker-ink)]">
              {skill.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close resources"
            className="rounded-lg p-2 hover:bg-[var(--tracker-hover)]"
          >
            <X size={20} />
          </button>
        </div>
        <p className="mt-3 text-sm font-semibold text-[var(--tracker-muted)]">
          Optional. Keep your courses, guides and useful links together.
        </p>
        {skill.resources?.length ? (
          <ul className="my-5 space-y-2">
            {skill.resources.map((resource) => (
              <li
                key={resource.id}
                className="flex items-center gap-2 rounded-xl border border-[var(--tracker-line)] bg-[var(--tracker-soft)] p-3"
              >
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-2 rounded text-sm font-bold text-[var(--tracker-ink)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--tracker-action)]"
                >
                  <span className="min-w-0 break-words">{resource.name}</span>
                  <ExternalLink size={14} className="shrink-0" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(resource.id)}
                  aria-label={`Remove ${resource.name}`}
                  className="rounded-lg p-2 text-[var(--tracker-muted)] hover:bg-[var(--tracker-hover)] hover:text-[var(--tracker-error)]"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="my-5 rounded-xl border border-dashed border-[var(--tracker-line)] p-4 text-sm text-[var(--tracker-muted)]">
            No resources yet. Add one whenever you find something helpful.
          </p>
        )}
        <form
          onSubmit={submit}
          className="space-y-4 border-t border-[var(--tracker-line)] pt-5"
        >
          <label className="block text-sm font-bold">
            Resource name
            <input
              ref={nameInput}
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Beginner course"
              className={styles.input}
            />
          </label>
          <label className="block text-sm font-bold">
            Link
            <input
              type="url"
              required
              maxLength={2048}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
              className={styles.input}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-[var(--tracker-error)]">
              {error}
            </p>
          )}
          <button
            disabled={busy || !name.trim() || !url.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--tracker-action)] p-3 font-extrabold text-[var(--tracker-on-action)] disabled:opacity-40"
          >
            <Plus size={17} />
            {busy ? "Saving…" : "Add resource"}
          </button>
        </form>
      </div>
    </dialog>
  );
}
