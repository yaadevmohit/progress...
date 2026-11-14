import { durationLabel, practiceBreakdown } from "./model";
import styles from "./tracker.module.css";

export default function PracticeDonut({
  skills,
}: {
  skills: { id: string; name: string; slot: number; seconds: number }[];
}) {
  const total = skills.reduce((sum, skill) => sum + skill.seconds, 0);
  const segments = practiceBreakdown(skills);
  const description = segments.length
    ? segments
        .map(
          (skill) =>
            `${skill.name}: ${durationLabel(skill.seconds)}, ${Math.round(skill.percent)}%`,
        )
        .join("; ")
    : "No learning time logged yet";
  return (
    <div className={styles.ring}>
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={`Learning time by skill. ${description}`}
        className={styles.donut}
      >
        <circle
          cx="50"
          cy="50"
          r="43"
          fill="none"
          stroke="var(--tracker-chart-empty)"
          strokeWidth="12"
        />
        {segments.map((skill) => (
          <circle
            key={skill.id}
            cx="50"
            cy="50"
            r="43"
            fill="none"
            stroke={skill.color}
            strokeWidth="12"
            pathLength="100"
            strokeDasharray={`${skill.percent} ${100 - skill.percent}`}
            strokeDashoffset={-skill.offset}
            transform="rotate(-90 50 50)"
            className={styles.donutSegment}
          >
            <title>
              {skill.name}: {durationLabel(skill.seconds)} (
              {Math.round(skill.percent)}%)
            </title>
          </circle>
        ))}
      </svg>
      <div className={styles.donutCenter} aria-hidden="true">
        <span className="text-3xl font-bold tracking-tight text-[var(--tracker-ink)]">
          {durationLabel(total)}
        </span>
        <span className="mt-1 text-xs font-semibold text-[var(--tracker-muted)]">
          total time
        </span>
      </div>
    </div>
  );
}
