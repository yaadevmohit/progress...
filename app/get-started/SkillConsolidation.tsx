"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, Check, Layers3, Sparkles } from "lucide-react";
import { buildSkillPlan } from "./skill-plan";
import styles from "./SkillConsolidation.module.css";

type Props = { skills: string[]; locked?: boolean; onReady?: (ready: boolean) => void };

export default function SkillConsolidation({ skills, locked = false, onReady }: Props) {
  const plan = buildSkillPlan(skills);
  const retained = plan.filter(track => !track.recommended);
  const additions = plan.filter(track => track.recommended);
  const additionCount = additions.length;
  const [stage, setStage] = useState(locked ? 3 : 0);
  const [recommendedVisible, setRecommendedVisible] = useState(locked ? additions.length : 0);
  const sources = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = sources.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    container.querySelectorAll<HTMLElement>("[data-source]").forEach(chip => {
      const rect = chip.getBoundingClientRect();
      chip.style.setProperty("--merge-x", `${bounds.left + bounds.width / 2 - rect.left - rect.width / 2}px`);
      chip.style.setProperty("--merge-y", `${bounds.top + bounds.height / 2 - rect.top - rect.height / 2}px`);
    });
  }, [skills]);

  useEffect(() => {
    if (locked) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers = [
      setTimeout(() => setStage(1), reduced ? 0 : 1400),
      setTimeout(() => setStage(2), reduced ? 0 : 2800),
      setTimeout(() => setStage(3), reduced ? 0 : 3800),
      ...Array.from({ length: additionCount }, (_, index) => setTimeout(() => setRecommendedVisible(index + 1), reduced ? 0 : 4200 + index * 650)),
      setTimeout(() => onReady?.(true), reduced ? 0 : 4700 + additionCount * 650),
    ];
    return () => timers.forEach(clearTimeout);
  }, [locked, additionCount, onReady]);

  return <div className={styles.consolidation} data-stage={stage}>
    {!locked && <div className={styles.sourceWrap} aria-hidden={stage >= 2}><div className={styles.sourceInner}>
      <p className={styles.caption}>Your starting list · {skills.length} skills</p>
      <div ref={sources} className={styles.sources}>{skills.map((skill,index) => <span key={skill} data-source style={{ animationDelay: `${index * 45}ms` }}>{skill}</span>)}</div>
      <div className={styles.mergeLabel} aria-hidden="true"><Layers3 size={17} /> Bringing related skills together</div>
    </div></div>}
    {!locked && stage < 2 && <ArrowDown size={18} className={styles.arrow} aria-hidden="true" />}
    <p className={styles.status} role="status">{stage < 1 ? "A shorter list starts with the overlap." : stage < 2 ? "Merging related tools into learning tracks…" : stage < 3 || recommendedVisible < additions.length ? "Adding a few analyst-focused suggestions…" : `${retained.length} existing ${retained.length === 1 ? "track" : "tracks"} + ${additions.length} ${additions.length === 1 ? "suggestion" : "suggestions"} · ${plan.length} focus areas in total`}</p>
    {stage >= 2 && <div className={styles.tracks}>
      {[...retained, ...additions.slice(0, recommendedVisible)].map(track => <article key={track.id} className={`${styles.track} ${track.recommended ? styles.recommended : ""}`}>
        <div className={styles.trackLabel}>{track.recommended ? <Sparkles size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}<span>{track.recommended ? "Suggested addition" : track.sources.length > 1 ? `${track.sources.length} skills, one track` : "From your list"}</span></div>
        <h2>{track.title}</h2>
        {track.sources.length > 0 && <div className={styles.members}>{track.sources.map(skill => <span key={skill}>{skill}</span>)}</div>}
        <p>{track.description}</p>
      </article>)}
    </div>}
    {stage === 3 && recommendedVisible === additions.length && <p className={styles.note}>These are learning tracks, not {plan.length} things to practise every day. Your original skills stay recorded. Start with one task inside one track.</p>}
    <div className={styles.sourceNote}>Analyst suggestions informed by <a href="https://www.onetonline.org/link/hot_tech/15-2051.01" target="_blank" rel="noreferrer">O*NET’s employer-based technology data</a> and <a href="https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/pl-300" target="_blank" rel="noreferrer">Microsoft’s Power BI analyst guide</a>. Requirements vary by role.</div>
  </div>;
}
