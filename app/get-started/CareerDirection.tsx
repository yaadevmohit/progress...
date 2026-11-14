"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Check, CornerDownLeft, Layers3, X } from "lucide-react";
import SkillConsolidation from "./SkillConsolidation";
import { APPLICATION_SPLIT } from "./skill-plan";
import StepLabel from "./StepLabel";
import { DIRECTION_LABELS, type DirectionAnswers } from "./career-direction";
import styles from "./CareerDirection.module.css";

type Props = { step: number; answers: DirectionAnswers; roles: string[]; skills: string[]; onChange?: (answer: DirectionAnswers) => void; onNext?: () => void; locked?: boolean; disabled?: boolean };

export default function CareerDirection({ step, answers: a, roles, skills, onChange, onNext, locked = false, disabled = false }: Props) {
  const [planReady, setPlanReady] = useState(locked);
  const [query, setQuery] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const priority = a.priority.length ? a.priority : roles;
  const unavailable = locked || disabled;
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); heading.current?.focus({ preventScroll: true }); }, [step]);
  function update(patch: Partial<DirectionAnswers>) { if (!unavailable) onChange?.({ ...a, ...patch }); }
  function addOutside(value: string) {
    const clean = value.trim();
    if (!clean || a.outside.length >= 5 || a.outside.some(item => item.toLowerCase() === clean.toLowerCase())) return;
    update({ outside: [...a.outside, clean] }); setQuery("");
  }
  const titles = [
    "Let’s put your paths in perspective.",
    "Two paths. Different reasons to choose them.",
    "Which career draws you in more?",
    "Which feels easier to learn?",
    "Where have you made the most progress?",
    "What else catches your interest?",
    "Does either career feel like something you truly want?",
    a.motivation === "no" ? "Practical doesn’t have to mean right for you." : "Let’s give each reason its own weight.",
    "Your workspace is taking shape.",
    "A little structure. Room for both paths.",
    "Fewer tracks. More connected progress.",
  ];
  const descriptions = [
    `You’re looking for a job and considering more than one career path: ${roles.join(" and ")}. If you had to put one first today, which would it be?`,
    "Now let’s decide how to approach these two job searches. Interest, ease of learning, and the progress you’ve already made can point in different directions. We’ll look at each separately.",
    "Imagine spending an afternoon learning about the work itself. Which would you choose out of curiosity?",
    `Being drawn to ${a.interest || "a career"} doesn’t necessarily make it easier. Which path feels more approachable when you sit down to learn?`,
    "Think about what you’ve actually done: a project, a course, a problem you solved, or a skill you can now use. Where do you see the clearest progress?",
    "It can be unrelated to work. These interests help us understand what energises you. They won’t be added as targets in your job-search workspace.",
    `You chose ${a.interest || "one path"} as more interesting and ${a.ease || "another"} as easier to learn. Compared with ${a.outside.length ? a.outside.join(" and ") : "your other interests"}, do either of these careers feel genuinely appealing—or mostly like practical options?`,
    a.motivation === "no" ? "If neither path really draws you in, ease alone may not be a good reason to give one more weight. We can respect your practical needs without treating them as your personal interests. Does that feel right?" : a.motivation === "yes" ? `You don’t have to choose between curiosity and practicality immediately. We can give ${a.interest} room to grow while recognising the momentum you have in ${a.progress}. Does that approach fit?` : "You don’t need a perfect answer yet. We can leave room to explore interest while still making practical progress. How would you like to hold that balance?",
    "Your answers are shaping a job-search workspace: two separate career tracks, a priority order, and a record of what interests you versus what feels achievable. Just a few more questions while we finish shaping your path.",
    "Let’s start with a 70/30 approach to applications: put 70% of your application effort into data analyst roles, and keep 30% for software developer roles. That gives the analyst track more consistency while keeping development in view. We can revisit this starting balance as you learn more.",
    "You don’t need a separate learning commitment for every tool. We’ll bring related skills into shared tracks, then suggest a few additions for analyst work. The result stays within six focus areas.",
  ];
  const roleQuestion = step >= 2 && step <= 4;
  const selected = step === 2 ? a.interest : step === 3 ? a.ease : a.progress;
  const canContinue = step === 0 || step === 1 || step === 8 || step === 9 || step === 10 && planReady || step === 5 && !query.trim() || roleQuestion && !!selected || step === 6 && !!a.motivation || step === 7 && !!a.balance;
  const choices = step === 6 ? [
    ["yes", "Yes, there’s genuine interest", "At least one path feels personally meaningful."],
    ["no", "No, they feel mostly practical", "I can see why they make sense, but I don’t feel a strong pull."],
    ["unsure", "I’m still figuring that out", "I need more experience before I can tell."],
  ] : [
    ["agree", "Yes, that feels right", "Keep interest and practicality as separate signals."],
    ["stability", "Stability needs to come first", "I need a practical route while I make room for other interests."],
    ["explore", "I’d like to explore this more", "I’m not ready to decide how much weight each should carry."],
  ];

  return <>
    <StepLabel number={step + 7} label={DIRECTION_LABELS[step]} />
    <h1 ref={heading} tabIndex={-1} id="direction-question">{titles[step]}</h1>
    <p className={styles.description}>{descriptions[step]}</p>
    {locked && <p className={styles.locked}>Your answers are saved for this session. This view is read-only.</p>}
    <form onSubmit={event => { event.preventDefault(); if (!unavailable && canContinue) { if (step === 9) update({ splitConfirmed: true }); if (step === 10) update({ planConfirmed: true }); onNext?.(); } }}>
      <fieldset disabled={unavailable} className={styles.fields}>
        <legend className={styles.srOnly}>{titles[step]}</legend>
        {step === 0 && <>
          <p className={styles.helper}>Select a career to move it to first place. This is a starting priority, not a permanent commitment.</p>
          <ol className={styles.priority}>
            {priority.map((role, index) => <li key={role}><button type="button" aria-pressed={index === 0} onClick={() => update({ priority: [role, ...priority.filter(item => item !== role)] })}><span className={styles.number}>{index + 1}</span><span>{role}<small>{index === 0 ? "First priority" : "Also exploring"}</small></span>{index === 0 ? <Check size={17} aria-hidden="true" /> : <ArrowUp size={17} aria-hidden="true" />}</button></li>)}
          </ol>
          <p className={styles.helper}>You’ve also listed {skills.length} skills, with {skills[0]} as the most familiar.</p>
        </>}
        {step === 9 && <>
          <div className={styles.splitBar} aria-label="Application focus: 70 percent data analyst, 30 percent software developer"><span>70%</span><span>30%</span></div>
          <div className={styles.splitCards}>{APPLICATION_SPLIT.map(track => <div key={track.role}><strong>{track.percent}<small>%</small></strong><h2>{track.role}</h2><p>{track.note}</p></div>)}</div>
          <p className={styles.helper}>For every ten applications, that could mean seven analyst applications and three developer applications. This split is about applications; it doesn’t change your personal interests or rank your skills.</p>
        </>}
        {step === 10 && <SkillConsolidation skills={skills} locked={locked} onReady={setPlanReady} />}
        {step === 1 && <div className={styles.signals}>{["Interest", "Ease of learning", "Progress so far"].map((label,index) => <div key={label}><span>0{index+1}</span>{label}</div>)}</div>}
        {roleQuestion && <div className={`${styles.roleChoices} ${step === 4 ? styles.momentum : ""}`}>
          {roles.map((role,index) => <label key={role} className={styles.roleChoice}><input type="radio" name={`direction-${step}`} checked={selected === role} value={role} onChange={() => update(step === 2 ? { interest: role } : step === 3 ? { ease: role } : { progress: role })} /><span className={styles.choiceLetter}>{String.fromCharCode(65+index)}</span><strong>{role}</strong><span className={styles.roleDetail}>{step === 2 ? "I’m more curious about this work" : step === 3 ? "Learning this feels more approachable" : "My clearest progress is here"}</span><Check size={16} className={styles.check} aria-hidden="true" /></label>)}
        </div>}
        {step === 5 && <>
          <div className={styles.tags}>{a.outside.map(item => <span key={item}>{item}{!locked && <button type="button" aria-label={`Remove interest ${item}`} onClick={() => update({ outside: a.outside.filter(value => value !== item) })}><X size={13} /></button>}</span>)}</div>
          {!locked && <>
            <div className={styles.interestField}><input aria-label="Interest outside work" value={query} maxLength={80} disabled={unavailable || a.outside.length >= 5} placeholder="Something I’m drawn to…" onChange={event => setQuery(event.target.value)} onKeyDown={event => { if(event.key === "Enter" && query.trim()) { event.preventDefault(); addOutside(query); } }} /><button type="button" disabled={!query.trim() || a.outside.length >= 5} onClick={() => addOutside(query)}>Add +</button></div>
            <div className={styles.examples}>{["Filmmaking & video editing", "Music", "Writing", "Design"].filter(item=>!a.outside.includes(item)).map(item => <button key={item} type="button" disabled={a.outside.length >= 5} onClick={()=>addOutside(item)}>{item} +</button>)}</div>
            <p className={styles.helper}>Add up to five interests, or continue without adding one.</p>
          </>}
        </>}
        {(step === 6 || step === 7) && <div className={styles.thoughtChoices}>{choices.map(([id,label,detail])=><label key={id}><input type="radio" name={`direction-${step}`} value={id} checked={(step === 6 ? a.motivation : a.balance) === id} onChange={()=>update(step === 6 ? {motivation:id} : {balance:id})} /><span><strong>{label}</strong><small>{detail}</small></span><Check size={16} className={styles.check} aria-hidden="true" /></label>)}</div>}
      </fieldset>
      {!locked && <div className={styles.actions}><button type="submit" disabled={disabled || !canContinue} aria-label="Confirm direction step">Enter <CornerDownLeft size={15} aria-hidden="true" /></button></div>}
    </form>
    {(step > 0 || locked) && <WorkspaceDraft answers={a} roles={roles} skills={skills} step={step} />}

  </>;
}


export function WorkspaceDraft({ answers: a, roles, skills = [], step = 10 }: { answers: DirectionAnswers; roles: string[]; skills?: string[]; step?: number }) {
  const priority = a.priority.length ? a.priority : roles;
  return <aside className={styles.workspace} aria-label="Job-search workspace draft">
      <div className={styles.workspaceHeading}><Layers3 size={15} aria-hidden="true" /><span>Your job-search workspace</span><small>Draft</small></div>
      {(step >= 9 || a.splitConfirmed) && <p>Application focus · 70% Data analyst / 30% Software developer</p>}
      <ol>{priority.map((role,index)=><li key={role}><span>{index+1}</span>{role}<small>{[a.interest === role && "Curiosity", a.ease === role && "Approachable", a.progress === role && "Momentum"].filter(Boolean).join(" · ")}</small></li>)}</ol>
      {a.outside.length > 0 && <p>Outside work · {a.outside.join(" / ")}</p>}
      {a.balance && <p>Approach · {a.balance === "stability" ? "Practical stability first, with room for personal interests." : a.balance === "agree" ? "Keep interest and practicality as separate signals." : "Leave room to explore before committing."}</p>}
      {a.planConfirmed && skills.length > 0 && <details className={styles.planDetails}><summary>View your consolidated skills plan</summary><SkillConsolidation skills={skills} locked /></details>}
      <footer>{step >= 8 ? "Priorities and preferences captured. Your search tracks are outlined." : "Your answers are shaping this outline as you go."}</footer>
    </aside>;
}
