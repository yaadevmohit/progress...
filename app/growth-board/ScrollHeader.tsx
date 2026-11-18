"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { INITIAL_HEADER, nextHeaderMotion } from "./scroll-header";
import styles from "./tracker.module.css";
export default function ScrollHeader({ children }: { children: ReactNode }) {
  const slot = useRef<HTMLDivElement>(null),
    header = useRef<HTMLElement>(null);
  const [view, setView] = useState(INITIAL_HEADER);
  useEffect(() => {
    let motion = { ...INITIAL_HEADER },
      frame = 0;
    const measure = () => {
      if (slot.current && header.current)
        slot.current.style.height = `${header.current.getBoundingClientRect().height}px`;
    };
    const update = () => {
      frame = 0;
      if (!slot.current) return;
      const bottom =
        slot.current.getBoundingClientRect().bottom + window.scrollY;
      const next = nextHeaderMotion(motion, window.scrollY, bottom);
      if (
        next.floating !== motion.floating ||
        next.visible !== motion.visible ||
        next.animated !== motion.animated
      )
        setView(next);
      motion = next;
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    measure();
    update();
    const observer = new ResizeObserver(measure);
    if (header.current) observer.observe(header.current);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", scroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  const hidden = view.floating && !view.visible;
  return (
    <div ref={slot}>
      <header
        ref={header}
        inert={hidden}
        aria-hidden={hidden || undefined}
        className={`${styles.header} ${view.floating ? styles.headerFloating : ""} ${view.animated ? styles.headerAnimated : ""} ${view.floating && view.visible ? styles.headerRevealed : ""}`}
      >
        {children}
      </header>
    </div>
  );
}
