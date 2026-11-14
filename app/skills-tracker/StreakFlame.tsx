"use client";
import { useEffect, useRef } from "react";
import { Flame } from "lucide-react";
import styles from "./tracker.module.css";

export default function StreakFlame({
  count,
  ready,
  size = 18,
}: {
  count: number;
  ready: boolean;
  size?: number;
}) {
  const icon = useRef<HTMLSpanElement>(null),
    previous = useRef<number | null>(null);
  useEffect(() => {
    if (!ready) return;
    const increased = previous.current !== null && count > previous.current;
    previous.current = count;
    if (
      !increased ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const animation = icon.current?.animate(
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
    return () => animation?.cancel();
  }, [count, ready]);
  return (
    <span ref={icon} className={styles.flame} aria-hidden="true">
      <Flame
        size={size}
        className={count > 0 ? styles.flameLit : styles.flameIdle}
      />
    </span>
  );
}
