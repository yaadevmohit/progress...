"use client";

import { useEffect } from "react";
import { activeSkills, decodeTracker, EMPTY_STATE } from "./model";
import { cancelTimer, finishTimer, startTimer, STORAGE_KEY } from "./storage";

// The content script is installed only on the origin explicitly connected by
// the user. No remote page receives Chrome APIs or arbitrary storage access.
export default function ExtensionBridge() {
  useEffect(() => {
    const read = () => {
      const decoded = decodeTracker(localStorage.getItem(STORAGE_KEY) ?? JSON.stringify(EMPTY_STATE));
      if (decoded.error) throw new Error(decoded.error);
      return decoded.state;
    };
    const receive = async (event: MessageEvent) => {
      if (event.source !== window || event.origin !== location.origin) return;
      const message = event.data;
      if (message?.channel !== "growth-board-extension-request" ||
          typeof message.id !== "string" || message.id.length > 100) return;
      try {
        const { command, payload = {} } = message;
        if (command === "start") {
          if (typeof payload.skillId !== "string" || typeof payload.minutes !== "number" ||
              typeof payload.notes !== "string") throw new Error("Invalid timer request.");
          await startTimer(payload.skillId, payload.minutes, payload.notes);
        } else if (command === "finish" || command === "cancel") {
          if (typeof payload.timerId !== "string") throw new Error("Invalid timer ID.");
          if (command === "finish") await finishTimer(payload.timerId);
          else await cancelTimer(payload.timerId);
        } else if (command !== "snapshot") {
          throw new Error("Unknown extension command.");
        }
        const state = read();
        window.postMessage({
          channel: "growth-board-extension-response", id: message.id,
          result: {
            skills: activeSkills(state.skills).map(({ id, name, parentId }) => ({ id, name, parentId })),
            timer: state.activeTimer,
            saved: typeof payload.timerId === "string" &&
              [...state.sessions, ...(state.retainedPractice ?? [])].some((s) => s.id === payload.timerId),
          },
        }, location.origin);
      } catch (error) {
        window.postMessage({ channel: "growth-board-extension-response", id: message.id,
          error: error instanceof Error ? error.message : "Could not connect to Growth Board." }, location.origin);
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  return null;
}
