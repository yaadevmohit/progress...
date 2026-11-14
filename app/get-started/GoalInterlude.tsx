"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useAmbientAudio } from "../ui/components/AmbientAudio";
import styles from "./page.module.css";

const MESSAGES = [
  "You may have wanted to select more options.",
  "But it’s best to focus on one thing at a time.",
];
const SENTENCE_MS = 4200;
export const CAREER_MESSAGES = [
  "Software developer and Data analyst. Two paths to explore.",
  "Great—these fields have a few foundations in common.",
  "Let’s build on what you already know.",
  "I’ll suggest some skills. You can make the list your own.",
];

export default function GoalInterlude({ onComplete, messages = MESSAGES, duration = SENTENCE_MS }: { onComplete: () => void; messages?: readonly string[]; duration?: number }) {
  const [sentence, setSentence] = useState(0);
  const played = useRef(false);
  const { playStepTone } = useAmbientAudio();

  useEffect(() => {
    if (!played.current) {
      playStepTone(0);
      played.current = true;
    }
    const timers = messages.slice(1).map((_, index) => setTimeout(() => {
      setSentence(index + 1);
      playStepTone((index + 1) % 2);
    }, duration * (index + 1)));
    const finish = setTimeout(onComplete, duration * messages.length);
    return () => { timers.forEach(clearTimeout); clearTimeout(finish); };
  }, [onComplete, playStepTone, messages, duration]);

  return (
    <section className={styles.interlude} style={{ "--sentence-duration": `${duration}ms` } as CSSProperties} aria-label="A moment to focus">
      <p key={sentence} className={styles.interludeMessage} role="status">{messages[sentence]}</p>
    </section>
  );
}
