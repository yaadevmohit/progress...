"use client";

import { useId, useState } from "react";
import styles from "./ProgressRail.module.css";

export type JourneyPoint = {
  id: string;
  label: string;
  summary: string;
  complete: boolean;
};

export default function ProgressRail({ points, current, onSelect }: {
  points: JourneyPoint[];
  current: string | null;
  onSelect: (id: string) => void;
}) {
  const id = useId();
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  return (
    <aside className={styles.rail} aria-label="Your journey so far">
      <ol>
        {points.map((point) => {
          const unavailable = !point.complete || point.id === current;
          const expanded = hovered === point.id || focused === point.id;
          const tooltipId = `${id}-${point.id}`;
          return (
            <li key={point.id} className={styles.point}>
              <button
                type="button"
                aria-label={point.complete ? point.label : `${point.label}: awaiting selection`}
                aria-current={point.id === current ? "step" : undefined}
                aria-disabled={unavailable}
                aria-describedby={expanded ? tooltipId : undefined}
                data-complete={point.complete}
                className={styles.marker}
                onMouseEnter={() => setHovered(point.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setFocused(point.id)}
                onBlur={() => setFocused(null)}
                onClick={() => {
                  if (unavailable) return;
                  setHovered(null);
                  setFocused(null);
                  onSelect(point.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setHovered(null);
                    setFocused(null);
                  }
                }}
              >
                <span aria-hidden="true" />
              </button>
              {expanded && (
                <div id={tooltipId} role="tooltip" className={styles.tooltip}>
                  <span className={styles.label}>{point.label}</span>
                  <p>{point.complete ? point.summary : "Awaiting selection. Choose your answer, then press Enter to continue."}</p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
