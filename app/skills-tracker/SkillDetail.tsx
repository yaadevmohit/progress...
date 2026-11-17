"use client";
import { ArrowLeft, ExternalLink, Plus } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  durationLabel,
  PRACTICE_COLORS,
  type LearningSession,
  type Skill,
} from "./model";
import SkillResources from "./SkillResources";
import SkillActions from "./SkillActions";
import DeleteSessionButton from "./DeleteSessionButton";
import { isActiveSkill } from "./model";
import styles from "./tracker.module.css";
export default function SkillDetail({
  skill,
  sessions,
  onBack,
  onLog,
  onRemoved,
}: {
  skill: Skill & { seconds: number };
  sessions: LearningSession[];
  onBack: () => void;
  onLog: () => void;
  onRemoved?: () => void;
}) {
  const section = useRef<HTMLElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    if (window.matchMedia("(max-width:760px)").matches) {
      section.current?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    }
  }, [skill.id]);
  const recent = [...sessions]
    .sort(
      (a, b) =>
        b.activityDate.localeCompare(a.activityDate) ||
        b.createdAt.localeCompare(a.createdAt),
    )
    .slice(0, 5);
  return (
    <section
      ref={section}
      aria-labelledby="skill-detail-title"
      className={`${styles.panel} ${styles.skillDetail}`}
      style={{ borderTopColor: PRACTICE_COLORS[skill.slot] }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-lg py-1 pr-2 text-xs font-bold hover:underline"
        >
          <ArrowLeft size={14} />
          All skills
        </button>
        <div className="flex items-center gap-3">
          <SkillActions skill={skill} inline onRemoved={onRemoved} />
          {isActiveSkill(skill) && (
            <button
              type="button"
              onClick={onLog}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold hover:bg-[var(--tracker-hover)]"
            >
              <Plus size={14} />
              Log session
            </button>
          )}
        </div>
      </div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2
          ref={heading}
          tabIndex={-1}
          id="skill-detail-title"
          className="min-w-0 break-words text-2xl font-extrabold"
        >
          {skill.name}{" "}
          {!isActiveSkill(skill) && (
            <span className={styles.statusBadge}>{skill.status}</span>
          )}
        </h2>
        <div>
          <strong className="text-3xl font-bold tracking-tight">
            {durationLabel(skill.seconds)}
          </strong>
          <span className="ml-2 text-xs font-semibold text-[var(--tracker-muted)]">
            time spent
          </span>
        </div>
      </div>
      {skill.description && (
        <p className="mb-5 whitespace-pre-wrap break-words text-sm text-[var(--tracker-muted)]">
          {skill.description}
        </p>
      )}
      <div className={styles.detailColumns}>
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold">Resources</h3>
            {skill.status !== "deleted" && (
              <SkillResources skill={skill} label="Manage resources" />
            )}
          </div>
          {skill.resources?.length ? (
            <ul className="space-y-2">
              {skill.resources.map((resource) => (
                <li key={resource.id}>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.resourceLink}
                  >
                    <span className="flex items-center justify-between gap-2 font-bold">
                      {resource.name}
                      <ExternalLink size={14} className="shrink-0" />
                    </span>
                    <span className="mt-1 block break-all text-xs text-[var(--tracker-muted)]">
                      {resource.url}
                    </span>
                    <span className="sr-only">opens in a new tab</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--tracker-muted)]">
              No resources yet.
            </p>
          )}
        </div>
        <div>
          <h3 className="mb-3 text-sm font-extrabold">Recent sessions</h3>
          {recent.length ? (
            <ul className="divide-y divide-[var(--tracker-line)]">
              {recent.map((session) => (
                <li key={session.id} className="py-3 first:pt-0">
                  <div className="flex justify-between gap-3 text-sm">
                    <time
                      dateTime={session.activityDate}
                      className="font-semibold"
                    >
                      {new Date(
                        session.activityDate + "T12:00:00Z",
                      ).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </time>
                    <div className="flex shrink-0 items-center gap-2">
                      <strong>{durationLabel(session.durationSeconds)}</strong>
                      <DeleteSessionButton
                        session={session}
                        skillName={skill.name}
                        count={sessions.length}
                      />
                    </div>
                  </div>
                  {session.notes && (
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-[var(--tracker-muted)]">
                      {session.notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--tracker-muted)]">
              No sessions yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
