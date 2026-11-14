"use client";

import { useState, type CSSProperties } from "react";
import { Check } from "lucide-react";
import { CAREER_SECTORS } from "./career-sectors";
import styles from "./SectorBubbles.module.css";

type Props = { selected: string[]; onChange?: (jobs: string[]) => void; locked?: boolean; disabled?: boolean };

export default function SectorBubbles({ selected, onChange, locked = false, disabled = false }: Props) {
  const [expanded, setExpanded] = useState<string[]>([]);
  if (locked) return <ul className={styles.selectedList} aria-label="Selected career interests">{selected.map(job => <li key={job}><Check size={14} aria-hidden="true" />{job}</li>)}</ul>;

  return <>
    <div className={styles.board} aria-label="Explore career sectors">
      {CAREER_SECTORS.map(sector => {
        const isOpen = expanded.includes(sector.id);
        const count = sector.jobs.filter(job => selected.includes(job)).length;
        return <div key={sector.id} className={`${styles.cluster} ${isOpen ? styles.expanded : ""}`}>
          <button type="button" className={styles.sector} disabled={disabled} aria-expanded={isOpen} aria-controls={`jobs-${sector.id}`} onClick={() => setExpanded(current => isOpen ? current.filter(id => id !== sector.id) : [...current, sector.id])}>
            <span>{sector.label}</span>
            {count > 0 && <span className={styles.sectorHint}>{count} selected</span>}
          </button>
          <div id={`jobs-${sector.id}`} role="group" aria-label={`${sector.label} careers`} hidden={!isOpen}>
            {sector.jobs.map((job, index) => {
              const angle = (index * 60 - 90) * Math.PI / 180;
              const chosen = selected.includes(job);
              return <button key={job} type="button" className={styles.job} disabled={disabled} aria-pressed={chosen} style={{ "--x": Math.cos(angle), "--y": Math.sin(angle), "--delay": `${index * 35}ms` } as CSSProperties} onClick={() => onChange?.(chosen ? selected.filter(item => item !== job) : [...selected, job])}>
                {chosen && <Check size={12} className={styles.check} aria-hidden="true" />}<span>{job}</span>
              </button>;
            })}
          </div>
        </div>;
      })}
    </div>
    <p className={styles.selection} role="status">{selected.length ? `${selected.length} career${selected.length === 1 ? "" : "s"} selected · Select again to remove` : "Open a sector, then choose any careers that interest you."}</p>
  </>;
}
