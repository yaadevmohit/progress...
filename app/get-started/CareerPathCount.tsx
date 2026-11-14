"use client";

import type { CSSProperties } from "react";
import styles from "./page.module.css";

export const PATH_COUNTS = ["1", "2", "3", "3+"] as const;
export type PathCount = typeof PATH_COUNTS[number];

export function pathCountSummary(count: string) {
  if (!count) return "You’re exploring several career directions and deciding how many you want to consider.";
  if (count === "1") return "You’re looking for a job and want to explore one career path in more depth.";
  if (count === "3+") return "You’re considering more than three career paths and want to find the right fit.";
  return `You’re considering ${count} different career paths and want to discover which one fits you best.`;
}

export default function CareerPathCount({ value, onChange, locked = false }: {
  value: string;
  onChange?: (value: PathCount) => void;
  locked?: boolean;
}) {
  return (
    <fieldset disabled={locked} className={styles.countChoices}>
      <legend className={styles.srOnly}>Number of career paths</legend>
      {PATH_COUNTS.map((count, index) => (
        <label key={count} className={styles.countOption} style={{ "--float-delay": `-${index * .8}s`, "--float-duration": `${4 + index * .45}s` } as CSSProperties}>
          <input
            className={styles.srOnly}
            type="radio"
            name={locked ? "review-path-count" : "path-count"}
            value={count}
            checked={value === count}
            aria-label={count === "3+" ? "More than 3 career paths" : `${count} career ${count === "1" ? "path" : "paths"}`}
            onChange={onChange ? () => onChange(count) : undefined}
            readOnly={locked}
            required={!locked}
          />
          <span className={styles.countFace} aria-hidden="true">{count}</span>
        </label>
      ))}
    </fieldset>
  );
}
