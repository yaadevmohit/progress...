"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { usePathname } from "next/navigation";
import { createAmbientAudio } from "../ambient-audio";
import styles from "./AmbientAudio.module.css";

const AudioContextState = createContext<{
  startJourney: () => void;
  playStepTone: (step: number) => void;
}>({ startJourney: () => {}, playStepTone: () => {} });

export function AmbientAudioProvider({ children }: { children: ReactNode }) {
  const audio = useRef<ReturnType<typeof createAmbientAudio> | null>(null);
  const mutedByUser = useRef(false);
  const playRequest = useRef(0);
  const suspendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const pathname = usePathname();
  const dark = pathname === "/";
  const audioDisabled = pathname.startsWith("/job-hunt") || pathname.startsWith("/skills-tracker");

  useEffect(() => () => {
    if (suspendTimer.current) clearTimeout(suspendTimer.current);
    void audio.current?.dispose().catch(() => {});
  }, []);

  useEffect(() => {
    audio.current?.setFormActive(pathname === "/get-started");
    if (audioDisabled) {
      ++playRequest.current;
      if (suspendTimer.current) clearTimeout(suspendTimer.current);
      audio.current?.mute();
      void audio.current?.context.suspend().then(() => setPlaying(false)).catch(() => setPlaying(false));
    }
  }, [pathname, audioDisabled]);

  function start(intensify = false) {
    if (audioDisabled) return;
    const request = ++playRequest.current;
    if (suspendTimer.current) clearTimeout(suspendTimer.current);
    try {
      audio.current ??= createAmbientAudio();
      audio.current.setFormActive(pathname === "/get-started");
      setError("");
      setPlaying(true);
      void audio.current.play(intensify, () => request === playRequest.current).catch(() => {
        if (request !== playRequest.current) return;
        setPlaying(false);
        setError("Audio couldn’t start. Try the sound button again.");
      });
    } catch {
      setError("Audio is unavailable in this browser.");
    }
  }

  const playStepTone = useCallback((step: number) => {
    if (!audioDisabled) audio.current?.reveal(step);
  }, [audioDisabled]);

  function toggle() {
    if (playing) {
      ++playRequest.current;
      mutedByUser.current = true;
      audio.current?.mute();
      setPlaying(false);
      suspendTimer.current = setTimeout(() => { void audio.current?.context.suspend().catch(() => {}); }, 800);
    } else {
      mutedByUser.current = false;
      start();
    }
  }

  return (
    <AudioContextState.Provider value={{ startJourney: () => { if (!mutedByUser.current) start(true); }, playStepTone }}>
      {children}
      {!audioDisabled && <div className={`${styles.control} ${dark ? styles.dark : ""}`}>
        <button type="button" onClick={toggle} aria-pressed={playing} aria-label={playing ? "Turn ambient sound off" : "Turn ambient sound on"} title={playing ? "Ambient sound on" : "Ambient sound off"} className={styles.toggle}>
          {playing ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
        </button>
        {error && <p role="status" className={styles.error}>{error}</p>}
      </div>}
    </AudioContextState.Provider>
  );
}

export function useAmbientAudio() {
  return useContext(AudioContextState);
}
