"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoveRight } from "lucide-react";
import { useAmbientAudio } from "./AmbientAudio";
import styles from "../../home.module.css";

export default function GetStartedButton() {
  const router = useRouter();
  const { startJourney } = useAmbientAudio();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const element = useRef<HTMLButtonElement>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    router.prefetch("/get-started");
    const main = element.current?.closest("main");
    return () => {
      if (timer.current) clearTimeout(timer.current);
      main?.removeAttribute("data-departing");
      document.documentElement.removeAttribute("data-journey-transition");
    };
  }, [router]);

  function begin() {
    if (leaving) return;
    setLeaving(true);
    startJourney();
    element.current?.closest("main")?.setAttribute("data-departing", "");
    document.documentElement.setAttribute("data-journey-transition", "");
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 100 : 1500;
    timer.current = setTimeout(() => router.push("/get-started"), duration);
  }

  return (
    <button ref={element} type="button" onClick={begin} disabled={leaving} className={styles.cta} aria-label={leaving ? "Entering your space" : "Get started"}>
      <span className={styles.ctaLabel}>{leaving ? "Entering…" : "Get started"}</span>
      <span className={styles.ctaArrow} aria-hidden="true"><MoveRight size={24} strokeWidth={1.5} /></span>
    </button>
  );
}
