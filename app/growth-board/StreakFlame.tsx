"use client";
import { useEffect, useRef } from "react";
import { Flame } from "lucide-react";
import { claimDailyStreak } from "./daily-streak";
import styles from "./tracker.module.css";

export default function StreakFlame({
  count,
  ready,
  size = 18,
  celebrateDay,
}: {
  count: number;
  ready: boolean;
  size?: number;
  celebrateDay?: string;
}) {
  const icon = useRef<HTMLSpanElement>(null),
    previous = useRef<number | null>(null);
  useEffect(() => {
    if (!ready) return;
    const increased = previous.current !== null && count > previous.current;
    previous.current = count;
    let animation: Animation | undefined;
    // Defer claiming the day until the animation can start. React's development
    // effect replay can then cancel the first frame without consuming the visit.
    const frame = requestAnimationFrame(() => {
      const daily =
        count > 0 && celebrateDay ? claimDailyStreak(celebrateDay) : false;
      if (
        (!increased && !daily) ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      animation = icon.current?.animate(
        [
          { transform: "scale(1)", filter: "drop-shadow(0 0 0px #fb923c)" },
          {
            transform: "scale(1.6) rotate(-12deg)",
            filter: "drop-shadow(0 0 12px #f97316)",
            offset: 0.3,
          },
          {
            transform: "scale(1.1) rotate(8deg)",
            filter: "drop-shadow(0 0 7px #fbbf24)",
            offset: 0.65,
          },
          { transform: "scale(1)", filter: "drop-shadow(0 0 0px #fb923c)" },
        ],
        { duration: 1200, easing: "ease-out" },
      );
    });
    return () => {
      cancelAnimationFrame(frame);
      animation?.cancel();
    };
  }, [count, ready, celebrateDay]);
  return (
    <span ref={icon} className={styles.flame} aria-hidden="true">
      <Flame
        size={size}
        className={count > 0 ? styles.flameLit : styles.flameIdle}
      />
    </span>
  );
}
