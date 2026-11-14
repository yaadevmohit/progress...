"use client";

import { useEffect, useState } from "react";
import { CornerDownLeft } from "lucide-react";
import { skillsReflection } from "./skills-reflection";
import styles from "./SkillsReflection.module.css";

type Props = { count: number; onContinue?: () => void; locked?: boolean };

export default function SkillsReflection({ count, onContinue, locked = false }: Props) {
  const messages = skillsReflection(count);
  const total = messages.join("\n\n").length;
  const [loading, setLoading] = useState(!locked);
  const [characters, setCharacters] = useState(locked ? total : 0);
  const complete = characters >= total;

  useEffect(() => {
    if (locked) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const text = skillsReflection(count).join("\n\n");
    let cursor = 0;
    let timer: ReturnType<typeof setTimeout>;
    const begin = setTimeout(() => {
      setLoading(false);
      if (reducedMotion) { setCharacters(text.length); return; }
      function type() {
        cursor++;
        setCharacters(cursor);
        if (cursor < text.length) {
          const previous = text[cursor - 1];
          timer = setTimeout(type, previous === "\n" ? 380 : /[.!?]/.test(previous) ? 420 : /[,—]/.test(previous) ? 140 : previous === " " ? 45 : 30);
        }
      }
      timer = setTimeout(type, 450);
    }, reducedMotion ? 200 : 1900);
    return () => { clearTimeout(begin); clearTimeout(timer); };
  }, [count, locked]);

  const lines = messages.map((message, index) => {
    const start = messages.slice(0, index).reduce((total, previous) => total + previous.length + 2, 0);
    return { message, shown: Math.max(0, Math.min(message.length, characters - start)), end: start + message.length };
  });

  return <div className={styles.reflection}>
    {loading ? <div className={styles.loading} role="status"><span className={styles.dots} aria-hidden="true"><i /><i /><i /></span><p>Finding a manageable starting point…</p></div> : <>
      <div className={styles.copy} aria-hidden="true">
        {lines.map(({ message, shown, end }, index) => <p key={index} className={styles.line}>
          <span className={styles.reserve}>{message}</span>
          <span className={styles.typed}>{message.slice(0, shown)}{!complete && shown > 0 && characters <= end && <span className={styles.cursor} />}</span>
        </p>)}
      </div>
      <div className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{lines.filter(line => characters >= line.end).map(line => line.message).join(" ")}</div>
      {!locked && <div className={styles.actions}>{complete && <button type="button" onClick={onContinue} aria-label="Continue after skills reflection">Enter <CornerDownLeft size={15} aria-hidden="true" /></button>}</div>}
    </>}
  </div>;
}
