"use client";
import { useState } from "react";
import { durationLabel, type Skill } from "./model";
import { restoreSkill } from "./storage";
import SkillActions from "./SkillActions";
import styles from "./tracker.module.css";
export default function PastSkills({
  skills,
  onView,
}: {
  skills: (Skill & { seconds: number })[];
  onView: (id: string) => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function restore(id: string) {
    setBusy(true);
    setError("");
    try {
      await restoreSkill(id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!skills.length) return null;
  return (
    <details className={`${styles.panel} my-6`}>
      <summary className="cursor-pointer text-sm font-bold">
        Past skills · {skills.length}
      </summary>
      {error && (
        <p role="alert" className="mt-3 text-sm text-[var(--tracker-error)]">
          {error}
        </p>
      )}
      <ul className="mt-3 max-h-72 divide-y divide-[var(--tracker-line)] overflow-auto">
        {skills.map((skill) => (
          <li
            key={skill.id}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div>
              <p className="break-words text-sm font-bold">
                {skill.name}{" "}
                <span className={styles.statusBadge}>{skill.status}</span>
              </p>
              <p className="mt-1 text-xs text-[var(--tracker-muted)]">
                {durationLabel(skill.seconds)} learned
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onView(skill.id)}
                className="text-xs font-bold underline"
              >
                View history
              </button>
              {skill.status === "archived" && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void restore(skill.id)}
                    className="text-xs font-bold underline"
                  >
                    Restore
                  </button>
                  <SkillActions skill={skill} inline />
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
