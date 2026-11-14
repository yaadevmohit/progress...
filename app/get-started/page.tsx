"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, ChevronDown, CornerDownLeft, LockKeyhole, Sparkles } from "lucide-react";
import FormLeaveGuard from "../ui/components/FormLeaveGuard";
import CareerPathCount, { pathCountSummary, type PathCount } from "./CareerPathCount";
import SectorBubbles from "./SectorBubbles";
import { careerInterestsSummary } from "./career-sectors";
import StepLabel from "./StepLabel";
import OpenWorkspace from "../job-hunt/OpenWorkspace";
import ProgressRail, { type JourneyPoint } from "./ProgressRail";
import { goalSummary } from "./progress-summary";
import GoalInterlude, { CAREER_MESSAGES } from "./GoalInterlude";
import SkillsGrid from "./SkillsGrid";
import SkillsReflection from "./SkillsReflection";
import CareerDirection, { WorkspaceDraft } from "./CareerDirection";
import { DIRECTION_LABELS, EMPTY_DIRECTION, directionSummary, type DirectionAnswers } from "./career-direction";
import { skillsReflection } from "./skills-reflection";
import { INITIAL_SKILLS, skillsSummary } from "./skills";
import { JOB_GOAL, JOB_SITUATIONS } from "./job-situations";
import { GOALS, recommendGoal } from "./goals";
import styles from "./page.module.css";

export default function GetStarted() {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [phase, setPhase] = useState<"goal" | "interlude" | "job" | "paths" | "sectors" | "career-review" | "skills" | "skills-reflection" | "direction" | "complete">("goal");
  const [review, setReview] = useState<string | null>(null);
  const [jobSituation, setJobSituation] = useState("");
  const [pathCount, setPathCount] = useState<PathCount | "">("");
  const [careerInterests, setCareerInterests] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [directionStep, setDirectionStep] = useState(0);
  const [direction, setDirection] = useState<DirectionAnswers>(EMPTY_DIRECTION);
  const confirmed = phase === "complete";
  const [departing, setDeparting] = useState(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
  }, []);

  function advance(next: "interlude" | "paths" | "sectors" | "career-review" | "skills" | "skills-reflection" | "direction" | "complete") {
    if (transitionTimer.current) return;
    setDeparting(true);
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650;
    transitionTimer.current = setTimeout(() => {
      transitionTimer.current = null;
      setPhase(next);
      setDeparting(false);
    }, delay);
  }
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const isJobGoal = value.trim().toLowerCase() === JOB_GOAL.toLowerCase() || recommendGoal(value) === JOB_GOAL;
  const finishInterlude = useCallback(() => setPhase(isJobGoal ? "job" : "complete"), [isJobGoal]);
  const finishCareerReview = useCallback(() => setPhase("skills"), []);
  const input = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLDivElement>(null);
  const chosen = useRef("");

  useEffect(() => {
    if (phase !== "goal" || !value.trim() || value === chosen.current) return;
    const timeout = setTimeout(() => setSuggestion(recommendGoal(value)), 5_000);
    return () => clearTimeout(timeout);
  }, [value, phase]);

  useLayoutEffect(() => {
    if (!open) return;
    function fitMenu() {
      const field = picker.current;
      const menu = field?.querySelector<HTMLElement>('[role="listbox"]');
      if (!field || !menu) return;
      const bounds = field.getBoundingClientRect();
      const below = window.innerHeight - bounds.bottom - 24;
      const above = bounds.top - 24;
      const upward = below < 180 && above > below;
      menu.dataset.side = upward ? "above" : "below";
      menu.style.maxHeight = `${Math.max(100, Math.min(320, upward ? above : below))}px`;
    }
    fitMenu();
    window.addEventListener("resize", fitMenu);
    return () => window.removeEventListener("resize", fitMenu);
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`goal-option-${highlight}`)?.scrollIntoView({ block: "nearest" });
  }, [open, highlight]);

  useEffect(() => {
    if (phase === "job" || phase === "paths" || phase === "sectors" || phase === "skills" || phase === "skills-reflection" || phase === "complete") stepHeading.current?.focus({ preventScroll: true });
  }, [phase, review]);

  useEffect(() => {
    if (!review) return;
    function closeReview(event: KeyboardEvent) {
      if (event.key === "Escape") setReview(null);
    }
    window.addEventListener("keydown", closeReview);
    return () => window.removeEventListener("keydown", closeReview);
  }, [review]);

  function choose(goal: string) {
    chosen.current = goal;
    setValue(goal);
    setOpen(false);
    setSuggestion(null);
    setPhase("goal");
    input.current?.focus();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) {
      input.current?.focus();
      return;
    }
    setOpen(false);
    setSuggestion(null);
    setJobSituation("");
    setPathCount("");
    setCareerInterests([]);
    setSkills([]);
    setDirection(EMPTY_DIRECTION);
    setDirectionStep(0);
    advance("interlude");
  }

  function confirmInterests(jobs: string[]) {
    const sharedTechPaths = jobs.length === 2 && jobs.includes("Software developer") && jobs.includes("Data analyst");
    if (sharedTechPaths) {
      setSkills([...INITIAL_SKILLS]);
      advance("career-review");
    } else advance("complete");
  }

  function nextDirection() {
    if (directionStep === DIRECTION_LABELS.length - 1) { advance("complete"); return; }
    if (transitionTimer.current) return;
    setDeparting(true);
    transitionTimer.current = setTimeout(() => {
      transitionTimer.current = null;
      setDirectionStep(step => step + 1);
      setDeparting(false);
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650);
  }

  const reachedDirection = phase === "direction" || (confirmed && direction.priority.length > 0);
  const reachedReflection = reachedDirection || phase === "skills-reflection" || (confirmed && skills.length > 0);
  const reachedSkills = reachedReflection || phase === "skills" || (confirmed && skills.length > 0);
  const interestsConfirmed = phase === "career-review" || reachedSkills || confirmed;
  const reachedSectors = phase === "sectors" || (interestsConfirmed && careerInterests.length > 0);
  const reachedPaths = reachedSectors || phase === "paths" || (phase === "complete" && jobSituation === "exploring-paths");
  const reachedSituation = reachedSectors || phase === "job" || phase === "paths" || (phase === "complete" && isJobGoal);
  const journey: JourneyPoint[] = [{
    id: "goal",
    label: "Your goal",
    summary: goalSummary(value),
    complete: phase !== "goal",
  }];
  if (reachedSituation) {
    journey.push({
      id: "situation",
      label: "Your situation",
      summary: JOB_SITUATIONS.find((option) => option.id === jobSituation)?.summary
        ?? "You’re looking for a job that fits you. You’re exploring what best describes your current career situation.",
      complete: reachedPaths || confirmed,
    });
  }

  if (reachedPaths) {
    journey.push({
      id: "paths",
      label: "Career paths",
      summary: pathCountSummary(pathCount),
      complete: reachedSectors || confirmed,
    });
  }

  if (reachedSectors) journey.push({ id: "sectors", label: "Career interests", summary: careerInterestsSummary(careerInterests), complete: interestsConfirmed });

  if (reachedSkills) journey.push({ id: "skills", label: "Your skills", summary: skillsSummary(skills), complete: reachedReflection });

  if (reachedReflection) journey.push({ id: "focus", label: "Finding your focus", summary: skillsReflection(skills.length).join(" "), complete: reachedDirection || confirmed });

  if (reachedDirection) DIRECTION_LABELS.slice(0, directionStep + 1).forEach((label, index) => journey.push({ id: `direction-${index}`, label, summary: directionSummary(index, direction, careerInterests, skills), complete: confirmed || index < directionStep }));
  const directionReview = review?.startsWith("direction-") ? Number(review.slice(10)) : null;

  return (
    <main className={styles.page} data-phase={phase}>
      <FormLeaveGuard active={!confirmed} />
      <ProgressRail
        points={journey}
        current={review ?? (phase === "complete" ? null : reachedDirection ? `direction-${directionStep}` : reachedReflection ? "focus" : reachedSkills ? "skills" : reachedSectors ? "sectors" : reachedPaths ? "paths" : reachedSituation ? "situation" : "goal")}
        onSelect={setReview}
      />
      {!review && phase === "goal" && <section className={`${styles.question} ${departing ? styles.questionLeaving : ""}`} aria-labelledby="goal-question">
        <StepLabel number={1} label="Starting point" />
        <h1 id="goal-question">What is your goal?</h1>
        <p className={styles.description}>A clear plan, a small change, or just a feeling.<br />Start wherever you are.</p>

        <form onSubmit={submit} className={styles.form}>
          <div ref={picker} className={styles.picker} onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
          }}>
            <div className={styles.field}>
              <input
                ref={input}
                id="goal"
                role="combobox"
                aria-label="Your goal"
                aria-expanded={open}
                aria-controls="goal-options"
                aria-autocomplete="list"
                aria-activedescendant={open ? `goal-option-${highlight}` : undefined}
                autoComplete="off"
                placeholder="I’d like to…"
                maxLength={500}
                value={value}
                onChange={(event) => {
                  chosen.current = "";
                  setValue(event.target.value);
                  setSuggestion(null);
                  setPhase("goal");
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    setOpen(true);
                    setHighlight((current) => open ? (current + (event.key === "ArrowDown" ? 1 : GOALS.length - 1)) % GOALS.length : 0);
                  } else if (event.key === "Escape") {
                    setOpen(false);
                  } else if (event.key === "Enter" && open) {
                    event.preventDefault();
                    choose(GOALS[highlight].label);
                  }
                }}
              />
              <button type="button" className={styles.expand} aria-label={open ? "Hide goal ideas" : "Show goal ideas"} aria-expanded={open} aria-controls="goal-options" onClick={() => {
                setOpen(!open);
                setHighlight(0);
                input.current?.focus();
              }}>
                <ChevronDown size={20} className={open ? styles.rotated : ""} aria-hidden="true" />
              </button>
              {value.trim() && !confirmed && (
                <button type="submit" className={styles.continue} aria-label="Confirm goal" aria-keyshortcuts="Enter">Enter <CornerDownLeft size={15} strokeWidth={1.5} aria-hidden="true" /></button>
              )}
            </div>
            {open && (
              <div id="goal-options" role="listbox" aria-label="Goal ideas" className={styles.options}>
                {GOALS.map((goal, index) => (
                  <div
                    key={goal.label}
                    id={`goal-option-${index}`}
                    role="option"
                    aria-selected={value === goal.label}
                    className={`${styles.option} ${index === highlight ? styles.highlight : ""}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => choose(goal.label)}
                  >
                    <span>{goal.label}</span>
                    {value === goal.label && <Check size={15} aria-hidden="true" />}
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className={styles.hint}>Write in your own words, or choose a direction <ChevronDown size={12} aria-hidden="true" /></p>
          <div className={styles.feedback} aria-live="polite">
            {suggestion && !open && (
              <button type="button" className={styles.suggestion} onClick={() => choose(suggestion)}>
                <Sparkles size={15} aria-hidden="true" />
                <span>Perhaps: <strong>{suggestion}</strong></span>
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            )}
          </div>

        </form>
      </section>}

      {!review && phase === "interlude" && <GoalInterlude onComplete={finishInterlude} />}

      {!review && phase === "job" && (
        <section className={`${styles.question} ${departing ? styles.questionLeaving : ""}`} aria-labelledby="job-question">
          <StepLabel number={2} label="Where you are now" />
          <h1 ref={stepHeading} tabIndex={-1} id="job-question">Which one describes you best?</h1>
          <p className={styles.description}>Choose the one that feels closest to where you are today.</p>
          <form className={styles.form} onSubmit={(event) => {
            event.preventDefault();
            if (jobSituation) advance(jobSituation === "exploring-paths" ? "paths" : "complete");
          }}>
            <fieldset className={styles.jobChoices}>
              <legend className={styles.srOnly}>Your current career situation</legend>
              {JOB_SITUATIONS.map((option, index) => (
                <label key={option.id} className={styles.jobChoice}>
                  <input type="radio" name="job-situation" value={option.id} checked={jobSituation === option.id} onChange={() => setJobSituation(option.id)} required />
                  <span className={styles.choiceKey} aria-hidden="true">{String.fromCharCode(65 + index)}</span>
                  <span>{option.label}</span>
                  <Check size={17} className={styles.choiceCheck} aria-hidden="true" />
                </label>
              ))}
            </fieldset>
            <div className={styles.stepActions}>
              {jobSituation && <button type="submit" className={styles.continue} aria-label="Confirm career situation" aria-keyshortcuts="Enter">Enter <CornerDownLeft size={15} strokeWidth={1.5} aria-hidden="true" /></button>}
            </div>
          </form>
        </section>
      )}

      {!review && phase === "paths" && (
        <section className={`${styles.question} ${departing ? styles.questionLeaving : ""}`} aria-labelledby="paths-question">
          <StepLabel number={3} label="Your possibilities" />
          <h1 ref={stepHeading} tabIndex={-1} id="paths-question">How many career paths are you considering?</h1>
          <p className={styles.description}>Think of the different directions you’re genuinely interested in.</p>
          <form className={styles.form} onSubmit={(event) => {
            event.preventDefault();
            if (pathCount) advance("sectors");
          }}>
            <CareerPathCount value={pathCount} onChange={setPathCount} />
            <div className={styles.stepActions}>
              {pathCount && <button type="submit" className={styles.continue} aria-label="Confirm number of career paths" aria-keyshortcuts="Enter">Enter <CornerDownLeft size={15} strokeWidth={1.5} aria-hidden="true" /></button>}
            </div>
          </form>
        </section>
      )}

      {!review && phase === "sectors" && (
        <section className={`${styles.question} ${departing ? styles.questionLeaving : ""}`} aria-labelledby="sectors-question">
          <StepLabel number={4} label="Follow your curiosity" />
          <h1 ref={stepHeading} tabIndex={-1} id="sectors-question">Which sectors interest you?</h1>
          <form className={styles.form} onSubmit={(event) => {
            event.preventDefault();
            if (pathCount === "3+" && careerInterests.length > 3) confirmInterests(careerInterests);
          }}>
            <SectorBubbles selected={careerInterests} disabled={departing} onChange={(jobs) => {
              if (departing) return;
              setCareerInterests(jobs);
              if (pathCount && pathCount !== "3+" && jobs.length === Number(pathCount)) confirmInterests(jobs);
            }} />
            <div className={styles.stepActions}>
              {pathCount === "3+" && careerInterests.length > 3 && <button type="submit" className={styles.continue} aria-label="Confirm career interests">Enter <CornerDownLeft size={15} strokeWidth={1.5} aria-hidden="true" /></button>}
            </div>
          </form>
        </section>
      )}

      {!review && phase === "career-review" && <GoalInterlude messages={CAREER_MESSAGES} duration={6000} onComplete={finishCareerReview} />}

      {!review && phase === "skills" && (
        <section className={`${styles.question} ${departing ? styles.questionLeaving : ""}`} aria-labelledby="skills-question">
          <StepLabel number={5} label="What you already know" />
          <h1 ref={stepHeading} tabIndex={-1} id="skills-question">Which skills feel familiar?</h1>
          <p className={styles.description}>Here are four starting suggestions. Keep what fits, remove what doesn’t, and add skills or languages—up to ten in total.</p>
          <p className={styles.description}>Arrange them from most to least familiar. Put the skill you know best first. Drag the handles, or use the arrow controls.</p>
          <form onSubmit={event => { event.preventDefault(); if (skills.length) advance("skills-reflection"); }}>
            <SkillsGrid skills={skills} onChange={setSkills} disabled={departing} />
            <div className={styles.stepActions}>
              {skills.length > 0 && <button type="submit" disabled={departing} className={styles.continue} aria-label="Confirm ranked skills">Enter <CornerDownLeft size={15} strokeWidth={1.5} aria-hidden="true" /></button>}
            </div>
          </form>
        </section>
      )}

      {!review && phase === "skills-reflection" && (
        <section className={`${styles.question} ${departing ? styles.questionLeaving : ""}`} aria-labelledby="focus-question">
          <StepLabel number={6} label="A little room to focus" />
          <h1 ref={stepHeading} tabIndex={-1} id="focus-question">You don’t have to do it all.</h1>
          <SkillsReflection count={skills.length} onContinue={() => { setDirection({ ...EMPTY_DIRECTION, priority: [...careerInterests] }); advance("direction"); }} />
        </section>
      )}

      {!review && phase === "direction" && (
        <section key={`direction-${directionStep}`} className={`${styles.question} ${departing ? styles.questionLeaving : ""}`} aria-labelledby="direction-question">
          <CareerDirection step={directionStep} answers={direction} roles={careerInterests} skills={skills} onChange={setDirection} onNext={nextDirection} disabled={departing} />
        </section>
      )}

      {directionReview !== null && (
        <section key={review} className={styles.question} aria-labelledby="direction-question">
          <CareerDirection step={directionReview} answers={direction} roles={careerInterests} skills={skills} locked />
          <button type="button" className={styles.returnToStep} onClick={() => setReview(null)}>{confirmed ? "Return to your summary" : "Return to current step"} <ArrowRight size={14} aria-hidden="true" /></button>
        </section>
      )}

      {review && directionReview === null && (
        <section key={review} className={styles.question} aria-labelledby="review-heading">
          <StepLabel number={review === "goal" ? 1 : review === "situation" ? 2 : review === "paths" ? 3 : review === "sectors" ? 4 : review === "skills" ? 5 : 6} label="Previously selected" />
          <h1 ref={stepHeading} tabIndex={-1} id="review-heading">{review === "goal" ? "What is your goal?" : review === "situation" ? "Which one describes you best?" : review === "paths" ? "How many career paths are you considering?" : review === "sectors" ? "Which sectors interest you?" : review === "skills" ? "Which skills feel familiar?" : "You don’t have to do it all."}</h1>
          <p className={styles.description}><LockKeyhole size={13} aria-hidden="true" className={styles.lockIcon} /> Your answer is locked. You can revisit it without changing your direction.</p>
          {review === "goal" ? (
            <div className={`${styles.field} ${styles.reviewField}`}>
              <input aria-label="Selected goal" value={value} readOnly />
              <LockKeyhole size={16} aria-hidden="true" />
            </div>
          ) : review === "situation" ? (
            <fieldset disabled className={`${styles.jobChoices} ${styles.reviewChoices}`}>
              <legend className={styles.srOnly}>Your selected career situation</legend>
              {JOB_SITUATIONS.map((option, index) => (
                <label key={option.id} className={styles.jobChoice}>
                  <input type="radio" name="review-situation" value={option.id} checked={jobSituation === option.id} readOnly />
                  <span className={styles.choiceKey} aria-hidden="true">{String.fromCharCode(65 + index)}</span>
                  <span>{option.label}</span>
                  <Check size={17} className={styles.choiceCheck} aria-hidden="true" />
                </label>
              ))}
            </fieldset>
          ) : review === "focus" ? (
            <SkillsReflection count={skills.length} locked />
          ) : review === "skills" ? (
            <SkillsGrid skills={skills} locked />
          ) : review === "sectors" ? (
            <SectorBubbles selected={careerInterests} locked />
          ) : (
            <div className={styles.reviewChoices}><CareerPathCount value={pathCount} locked /></div>
          )}
          <button type="button" className={styles.returnToStep} onClick={() => setReview(null)}>
            {confirmed ? "Return to your summary" : "Return to current step"} <ArrowRight size={14} aria-hidden="true" />
          </button>
        </section>
      )}

      {!review && phase === "complete" && (
        <section className={`${styles.question} ${departing ? styles.questionLeaving : ""}`} aria-labelledby="starting-point">
          <StepLabel number={journey.length + 1} label="Your starting point" />
          <h1 ref={stepHeading} tabIndex={-1} id="starting-point">{value.trim()}</h1>
          {jobSituation && <p className={styles.description}>{JOB_SITUATIONS.find((option) => option.id === jobSituation)?.label}</p>}
          {pathCount && <p className={styles.description}>{pathCountSummary(pathCount)}</p>}
          {careerInterests.length > 0 && <SectorBubbles selected={careerInterests} locked />}
          {skills.length > 0 && <SkillsGrid skills={skills} locked />}
          {direction.priority.length > 0 && <WorkspaceDraft answers={direction} roles={careerInterests} skills={skills} />}
          {direction.planConfirmed && <OpenWorkspace skills={skills} priority={direction.priority} />}
          <p className={styles.saved}><Check size={16} aria-hidden="true" /> One direction. One step at a time.</p>
        </section>
      )}
    </main>
  );
}
