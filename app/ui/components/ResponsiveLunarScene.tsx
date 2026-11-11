"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

const AnimatedScene = dynamic(() => import("./LunarStaircase"), { ssr: false });
const DESKTOP_QUERY = "(min-width: 768px)";

function subscribe(listener: () => void) {
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

function getSnapshot() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export default function ResponsiveLunarScene() {
  const desktop = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Mobile uses the static WebP in home.module.css and never loads the animation.
  return desktop ? <AnimatedScene /> : null;
}
