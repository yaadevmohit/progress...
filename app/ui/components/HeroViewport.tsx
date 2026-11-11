"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "../../home.module.css";

type Gesture = Event & { scale: number; clientX: number; clientY: number };

export default function HeroViewport({ children }: { children: ReactNode }) {
  const hero = useRef<HTMLElement>(null);
  const resetButton = useRef<HTMLButtonElement>(null);
  const resetView = useRef(() => {});

  useEffect(() => {
    const element = hero.current;
    if (!element) return;

    let zoom = 1;
    let x = 0;
    let y = 0;
    let gestureScale = 1;
    let frame = 0;
    const desktop = window.matchMedia("(min-width: 768px)");

    function render() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element!.style.setProperty("--gesture-scale", String(zoom));
        element!.style.setProperty("--gesture-x", `${x}px`);
        element!.style.setProperty("--gesture-y", `${y}px`);
        element!.toggleAttribute("data-user-zoom", zoom > 1);
        if (resetButton.current) resetButton.current.hidden = zoom === 1;
      });
    }

    function reset() {
      zoom = 1;
      x = y = 0;
      render();
    }
    resetView.current = reset;

    function zoomAt(factor: number, clientX: number, clientY: number) {
      const bounds = element!.getBoundingClientRect();
      const pointerX = clientX - bounds.left;
      const pointerY = clientY - bounds.top;
      const nextZoom = Math.max(1, Math.min(6, zoom * factor));
      // Keep the scene point beneath the pointer in the same screen position.
      x = pointerX - (pointerX - x) * nextZoom / zoom;
      y = pointerY - (pointerY - y) * nextZoom / zoom;
      zoom = nextZoom;
      if (zoom === 1) x = y = 0;
      render();
    }

    function canZoom() {
      return desktop.matches && !!element!.querySelector("svg[data-lunar-scene]");
    }

    function wheel(event: WheelEvent) {
      // Desktop trackpad pinch is delivered as Ctrl+wheel.
      if (!event.ctrlKey || !canZoom()) return;
      event.preventDefault();
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 300 : 1);
      zoomAt(Math.exp(-pixels * .008), event.clientX, event.clientY);
    }

    function gesture(event: Event) {
      if (!canZoom()) return;
      event.preventDefault();
      const pinch = event as Gesture;
      if (event.type === "gesturestart") {
        gestureScale = pinch.scale || 1;
      } else if (event.type === "gesturechange" && pinch.scale > 0) {
        zoomAt(pinch.scale / gestureScale, pinch.clientX, pinch.clientY);
        gestureScale = pinch.scale;
      }
    }

    element.addEventListener("wheel", wheel, { passive: false });
    element.addEventListener("gesturestart", gesture, { passive: false });
    element.addEventListener("gesturechange", gesture, { passive: false });
    desktop.addEventListener("change", reset);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("wheel", wheel);
      element.removeEventListener("gesturestart", gesture);
      element.removeEventListener("gesturechange", gesture);
      desktop.removeEventListener("change", reset);
    };
  }, []);

  return (
    <main ref={hero} className={styles.hero}>
      {children}
      <button ref={resetButton} hidden type="button" onClick={() => resetView.current()} className={styles.resetView}>
        Reset view
      </button>
    </main>
  );
}
