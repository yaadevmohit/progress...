"use client";
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  GitBranch,
  Plus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  durationLabel,
  isActiveSkill,
  PRACTICE_COLORS,
  SKILL_TEXT_COLORS,
  skillTrail,
  type LearningSession,
  type Skill,
  type skillStats,
} from "./model";
import SkillResources from "./SkillResources";
import SkillActions from "./SkillActions";
import SkillComposer from "./SkillComposer";
import DeleteSessionButton from "./DeleteSessionButton";
import styles from "./tracker.module.css";
export default function SkillDetail({
  skill,
  sessions,
  allSkills = [skill],
  stats = [],
  periodLabel = "total time",
  allSessions = sessions,
  onSelect,
  onBack,
  onLog,
  onRemoved,
}: {
  skill: Skill & { seconds: number; ownSeconds?: number };
  sessions: LearningSession[];
  allSessions?: LearningSession[];
  periodLabel?: string;
  allSkills?: Skill[];
  stats?: ReturnType<typeof skillStats>;
  onSelect?: (id: string) => void;
  onBack: () => void;
  onLog: (id?: string) => void;
  onRemoved?: () => void;
}) {
  const section = useRef<HTMLElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  const [tab, setTab] = useState("subskills"),
    [adding, setAdding] = useState(false);
  const children = stats.filter((s) => s.parentId === skill.id);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    if (window.matchMedia("(max-width:760px)").matches)
      section.current?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
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
      <nav aria-label="Skill hierarchy" className={styles.skillBreadcrumb}>
        <button onClick={onBack}>
          <ArrowLeft size={13} />
          All skills
        </button>
        {skillTrail(allSkills, skill.id)
          .slice(0, -1)
          .map((parent) => (
            <span key={parent.id}>
              <ChevronRight size={12} />
              <button onClick={() => onSelect?.(parent.id)}>
                {parent.name}
              </button>
            </span>
          ))}
      </nav>
      <div className="my-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {skill.parentId && (
            <span className={styles.subskillLabel}>
              <GitBranch size={12} />
              Subskill
            </span>
          )}
          <h2
            ref={heading}
            tabIndex={-1}
            id="skill-detail-title"
            className="truncate text-xl font-extrabold"
            title={skill.name}
          >
            {skill.name}{" "}
            {!isActiveSkill(skill) && (
              <span className={styles.statusBadge}>{skill.status}</span>
            )}
          </h2>
          <p className="mt-1 text-sm font-bold">
            {durationLabel(skill.seconds)}{" "}
            <span className="text-xs font-semibold text-(--tracker-muted)">
              {periodLabel}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SkillActions skill={skill} inline onRemoved={onRemoved} />
          {isActiveSkill(skill) && (
            <button
              className={styles.icon}
              aria-label={`Log session for ${skill.name}`}
              onClick={() => onLog(skill.id)}
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>
      {skill.description && (
        <p className="mb-3 line-clamp-2 text-sm font-semibold text-(--tracker-muted)">
          {skill.description}
        </p>
      )}
      <div
        role="tablist"
        aria-label="Skill details"
        className={styles.detailTabs}
      >
        {[
          ["subskills", `Subskills · ${children.filter(isActiveSkill).length}`],
          ["resources", `Resources · ${skill.resources?.length ?? 0}`],
          ["sessions", `Sessions · ${sessions.length}`],
        ].map(([id, label]) => (
          <button
            key={id}
            id={`tab-${id}`}
            role="tab"
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={styles.detailScroll}>
        <div
          role="tabpanel"
          id="panel-subskills"
          aria-labelledby="tab-subskills"
          hidden={tab !== "subskills"}
        >
          <div className={styles.subskillGrid}>
            <div className={styles.directPractice}>
              <span className="text-xs font-bold">{skill.name}</span>
              <strong>
                {durationLabel(skill.ownSeconds ?? skill.seconds)}
              </strong>
              <span className="text-xs text-(--tracker-muted)">
                Direct practice
              </span>
            </div>
            {children.filter(isActiveSkill).map((child) => (
              <div
                key={child.id}
                className={`${styles.subskillCard} ${styles.learnedSkill}`}
                style={{
                  backgroundColor: PRACTICE_COLORS[child.slot],
                  color: SKILL_TEXT_COLORS[child.slot],
                }}
                data-ink={
                  child.slot === 2 || child.slot === 5 ? "dark" : "light"
                }
              >
                <SkillActions skill={child} />
                <button
                  className={styles.subskillOpen}
                  onClick={() => onSelect?.(child.id)}
                >
                  <span className={styles.subskillLabel}>
                    <GitBranch size={12} />
                    Subskill
                  </span>
                  <strong className="block truncate pr-10" title={child.name}>
                    {child.name}
                  </strong>
                  <span className="mt-1 block text-xl font-bold">
                    {durationLabel(child.seconds)}
                  </span>
                  <span className="text-xs">
                    {child.streak}-day streak{" "}
                    <ChevronRight className="inline" size={13} />
                  </span>
                </button>
              </div>
            ))}
            {isActiveSkill(skill) &&
              (adding ? (
                <div className={styles.subskillComposer}>
                  <SkillComposer
                    parentId={skill.id}
                    onSaved={() => setAdding(false)}
                    onCancel={() => setAdding(false)}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setAdding(true)}
                  className={styles.addSubskill}
                >
                  <Plus size={30} />
                  <span>Add subskill</span>
                </button>
              ))}
          </div>
          {!!children.filter((s) => !isActiveSkill(s)).length && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer font-bold">
                Past subskills
              </summary>
              {children
                .filter((s) => !isActiveSkill(s))
                .map((child) => (
                  <button
                    key={child.id}
                    onClick={() => onSelect?.(child.id)}
                    className="mt-2 block w-full text-left"
                  >
                    {child.name} · {durationLabel(child.seconds)}{" "}
                    <span className={styles.statusBadge}>{child.status}</span>
                  </button>
                ))}
            </details>
          )}
        </div>
        <div
          role="tabpanel"
          id="panel-resources"
          aria-labelledby="tab-resources"
          hidden={tab !== "resources"}
        >
          {skill.status !== "deleted" && (
            <SkillResources skill={skill} label="Manage resources" />
          )}
          {skill.resources?.length ? (
            <ul className="mt-3 space-y-2">
              {skill.resources.map((r) => (
                <li key={r.id}>
                  <a
                    className={styles.resourceLink}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="flex items-center justify-between gap-2 font-bold">
                      {r.name}
                      <ExternalLink size={14} />
                    </span>
                    <span className="block truncate text-xs text-(--tracker-muted)">
                      {r.url}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-(--tracker-muted)">
              No resources yet.
            </p>
          )}
        </div>
        <div
          role="tabpanel"
          id="panel-sessions"
          aria-labelledby="tab-sessions"
          hidden={tab !== "sessions"}
        >
          {recent.length ? (
            <ul className="divide-y divide-(--tracker-line)">
              {recent.map((session) => (
                <li key={session.id} className="py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {allSkills.find((s) => s.id === session.skillId)
                          ?.name ?? skill.name}
                      </p>
                      <time className="text-xs text-(--tracker-muted)">
                        {session.activityDate}
                      </time>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold">
                      {durationLabel(session.durationSeconds)}
                      <DeleteSessionButton
                        session={session}
                        skillName={
                          allSkills.find((s) => s.id === session.skillId)
                            ?.name ?? skill.name
                        }
                        count={
                          allSessions.filter(
                            (s) => s.skillId === session.skillId,
                          ).length
                        }
                      />
                    </div>
                  </div>
                  {session.notes && (
                    <p className="mt-1 line-clamp-2 text-xs text-(--tracker-muted)">
                      {session.notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-(--tracker-muted)">No sessions yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
