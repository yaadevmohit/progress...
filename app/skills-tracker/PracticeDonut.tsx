"use client";
import { useId, useState } from "react";
import { durationLabel, practiceBreakdown } from "./model";
import { donutPath } from "./donut-path";
import styles from "./tracker.module.css";
export default function PracticeDonut({
  skills,
  selectedId,
  onSelect,
}: {
  skills: { id: string; name: string; slot: number; seconds: number }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null),
    tooltipId = useId();
  const total = skills.reduce((sum, skill) => sum + skill.seconds, 0),
    segments = practiceBreakdown(skills);
  const active = segments.find((skill) => skill.id === hovered),
    highlight = hovered ?? selectedId;
  return (
    <div className={styles.ring}>
      <svg
        viewBox="0 0 100 100"
        role="group"
        aria-label="Learning time by skill"
        className={styles.donut}
      >
        <circle
          cx="50"
          cy="50"
          r="43"
          fill="none"
          stroke="var(--tracker-chart-empty)"
          strokeWidth="12"
          aria-hidden="true"
        />
        {segments.map((skill) => {
          const percentage = Math.round(skill.percent * 10) / 10;
          return (
            <path
              key={skill.id}
              d={donutPath(skill.offset, skill.percent)}
              fillRule="evenodd"
              fill={skill.color}
              role="button"
              tabIndex={0}
              aria-label={`${skill.name}: ${durationLabel(skill.seconds)}, ${percentage}% of learning time. Show skill details`}
              aria-pressed={selectedId === skill.id}
              aria-describedby={hovered === skill.id ? tooltipId : undefined}
              onPointerEnter={() => setHovered(skill.id)}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered(skill.id)}
              onBlur={() => setHovered(null)}
              onClick={() => onSelect(skill.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(skill.id);
                }
                if (event.key === "Escape") setHovered(null);
              }}
              style={{
                opacity: highlight && highlight !== skill.id ? 0.35 : 1,
              }}
              className={styles.donutSegment}
            />
          );
        })}
      </svg>
      <div className={styles.donutCenter}>
        <span className="text-3xl font-bold tracking-tight text-[var(--tracker-ink)]">
          {durationLabel(total)}
        </span>
        <span className="mt-1 text-xs font-semibold text-[var(--tracker-muted)]">
          total time
        </span>
      </div>
      {active && (
        <div id={tooltipId} role="tooltip" className={styles.donutTooltip}>
          <strong>{active.name}</strong>
          <span>
            {durationLabel(active.seconds)} ·{" "}
            {Math.round(active.percent * 10) / 10}% of total time
          </span>
        </div>
      )}
    </div>
  );
}
