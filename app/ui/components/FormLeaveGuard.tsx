"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import styles from "./FormLeaveGuard.module.css";

const GUARD_KEY = "progressGoalGuard";

export default function FormLeaveGuard({ active }: { active: boolean }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const shouldGuard = useRef(active);
  const installed = useRef(false);
  const allowed = useRef(false);
  const restoring = useRef(false);
  const token = useRef("");
  const leave = useRef(() => {});

  useEffect(() => {
    shouldGuard.current = active;
    if (!active) dialog.current?.close();
    if (!active || installed.current) return;

    token.current = crypto.randomUUID();
    // An extra entry for the same URL lets Back be restored before asking.
    // Preserve Next.js's own history state so client-side routing stays intact.
    window.history.pushState({ ...window.history.state, [GUARD_KEY]: token.current }, "", window.location.href);
    installed.current = true;
  }, [active]);

  useEffect(() => {
    const modal = dialog.current;

    function beforeUnload(event: BeforeUnloadEvent) {
      if (!shouldGuard.current || allowed.current) return;
      event.preventDefault();
      event.returnValue = "";
    }

    function onPopState(event: PopStateEvent) {
      if (!installed.current || allowed.current) return;
      if (restoring.current) {
        event.stopImmediatePropagation();
        restoring.current = false;
        if (shouldGuard.current && modal && !modal.open) {
          modal.showModal();
          modal.querySelector<HTMLButtonElement>("[data-stay]")?.focus();
        }
        return;
      }
      if (window.history.state?.[GUARD_KEY] === token.current) return;
      // Keep Next.js from rendering the temporary entry while we restore it.
      event.stopImmediatePropagation();
      if (!shouldGuard.current) {
        allowed.current = true;
        window.history.back();
        return;
      }
      // Return to the guarded entry before showing the custom modal.
      restoring.current = true;
      window.history.forward();
    }

    leave.current = () => {
      allowed.current = true;
      modal?.close();
      // Skip the same-URL guard entry and the form's original entry.
      if (window.history.length > 2) window.history.go(-2);
      else router.replace("/");
    };

    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("popstate", onPopState, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("popstate", onPopState, true);
    };
  }, [router]);

  return (
    <dialog ref={dialog} aria-labelledby="leave-form-title" aria-describedby="leave-form-description" className={styles.dialog}>
      <span className={styles.icon}><ArrowLeft size={20} aria-hidden="true" /></span>
      <h2 id="leave-form-title">Leave this form?</h2>
      <p id="leave-form-description">You haven’t finished this step yet. Leave now, or stay and find your starting point?</p>
      <div className={styles.actions}>
        <button type="button" className={styles.leave} onClick={() => leave.current()}>Leave anyway</button>
        <button type="button" data-stay className={styles.stay} onClick={() => dialog.current?.close()}>Keep going</button>
      </div>
    </dialog>
  );
}
