"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteSession } from "./storage";
import type { LearningSession } from "./model";
import TrackerModal from "./TrackerModal";
import styles from "./tracker.module.css";
export default function DeleteSessionButton({
  session,
  skillName,
  count,
  onDeleted,
}: {
  session: LearningSession;
  skillName: string;
  count: number;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false),
    [all, setAll] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function remove() {
    if (busy) return;
    setBusy(true);
    try {
      await deleteSession(session.id, all);
      onDeleted?.();
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAll(false);
          setError("");
          setOpen(true);
        }}
        aria-label={`Delete session for ${skillName} on ${session.activityDate}`}
        className={`${styles.sessionDelete} rounded-lg p-2`}
        title="Delete session"
      >
        <Trash2 size={15} />
      </button>
      {open && (
        <TrackerModal
          title="Delete this session?"
          onClose={() => setOpen(false)}
          busy={busy}
        >
          <p className="font-bold">{skillName}</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--tracker-muted)]">
            This permanently removes the session and its practice time. Totals,
            streaks, charts, and activity history will be recalculated.
          </p>
          {count > 1 && (
            <label className="mt-5 flex items-start gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={all}
                onChange={(e) => setAll(e.target.checked)}
                className="mt-1 accent-[var(--tracker-action)]"
              />
              Delete all {count} session entries for this skill
            </label>
          )}
          {error && (
            <p
              role="alert"
              className="mt-3 text-sm text-[var(--tracker-error)]"
            >
              {error}
            </p>
          )}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className={styles.actionButton}
            >
              {all ? "Delete all sessions" : "Delete session"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="px-3 text-sm font-bold"
            >
              Cancel
            </button>
          </div>
        </TrackerModal>
      )}
    </>
  );
}
