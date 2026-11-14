"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, CornerDownLeft, GripVertical, Plus, X } from "lucide-react";
import { SKILL_DATASET, SKILL_LIMIT, suggestSkills } from "./skills";
import styles from "./SkillsGrid.module.css";

type Props = { skills: string[]; onChange?: (skills: string[]) => void; locked?: boolean; disabled?: boolean };

export default function SkillsGrid({ skills, onChange, locked = false, disabled = false }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [dragged, setDragged] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const rows = useRef<HTMLOListElement>(null);
  const positions = useRef(new Map<string, number>());
  const field = useRef<HTMLInputElement>(null);
  const full = skills.length >= SKILL_LIMIT;
  const suggestions = suggestSkills(query, skills);
  const trimmed = query.trim();
  const canonical = SKILL_DATASET.find(skill => skill.name.toLowerCase() === trimmed.toLowerCase() || skill.aliases.includes(trimmed.toLowerCase()))?.name ?? trimmed;
  const duplicate = skills.some(skill => skill.toLowerCase() === canonical.toLowerCase());
  const choices = [...suggestions, ...(trimmed && !duplicate && !suggestions.includes(canonical) ? [canonical] : [])];
  const activeIndex = Math.min(highlight, Math.max(0, choices.length - 1));

  useLayoutEffect(() => {
    const next = new Map<string, number>();
    rows.current?.querySelectorAll<HTMLElement>("[data-skill]").forEach(row => {
      const key = row.dataset.skill!;
      const top = row.offsetTop;
      const old = positions.current.get(key);
      if (old !== undefined && old !== top && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        row.animate([{ transform: `translateY(${old - top}px)` }, { transform: "translateY(0)" }], { duration: 240, easing: "ease-out" });
      }
      next.set(key, top);
    });
    positions.current = next;
  }, [skills]);

  function add(skill: string) {
    if (locked || disabled || full || !skill || skills.some(item => item.toLowerCase() === skill.toLowerCase())) return;
    onChange?.([...skills, skill]);
    setAnnouncement(`${skill} added. ${skills.length + 1} of ${SKILL_LIMIT} skills.`);
    setQuery("");
    setHighlight(0);
    setOpen(false);
    field.current?.focus();
  }

  function move(skill: string, index: number) {
    if (locked || disabled) return;
    const from = skills.indexOf(skill);
    if (from < 0 || index < 0 || index >= skills.length || from === index) return;
    const next = skills.filter(item => item !== skill);
    next.splice(index, 0, skill);
    onChange?.(next);
    setAnnouncement(`${skill}, position ${index + 1} of ${skills.length}.`);
  }

  return <div className={styles.editor}>
    <div className={styles.listHeader}><span>Most familiar first</span><span>{skills.length} / {SKILL_LIMIT}</span></div>
    <ol ref={rows} className={styles.grid} aria-label="Skills ranked from most to least familiar">
      {skills.map((skill, index) => <li key={skill} data-skill={skill} className={styles.row} data-dragging={dragged === skill}>
        {!locked && <button type="button" className={styles.handle} disabled={disabled} aria-label={`Reorder ${skill}. Use up and down arrows.`}
          onKeyDown={event => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); move(skill, index + (event.key === "ArrowUp" ? -1 : 1)); } }}
          onPointerDown={event => { if (disabled) return; event.currentTarget.setPointerCapture(event.pointerId); setDragged(skill); }}
          onPointerMove={event => { if (dragged !== skill) return; const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-skill]"); const at = skills.indexOf(target?.dataset.skill ?? ""); if (at >= 0) move(skill, at); }}
          onPointerUp={() => setDragged(null)} onPointerCancel={() => setDragged(null)} onLostPointerCapture={() => setDragged(null)}><GripVertical size={17} aria-hidden="true" /></button>}
        <span className={styles.rank}>{index + 1}</span><span className={styles.name}>{skill}</span>
        {!locked && <>
          <span className={styles.moves}>
            <button type="button" disabled={disabled || index === 0} aria-label={`Move ${skill} up`} onClick={() => move(skill, index - 1)}><ArrowUp size={13} aria-hidden="true" /></button>
            <button type="button" disabled={disabled || index === skills.length - 1} aria-label={`Move ${skill} down`} onClick={() => move(skill, index + 1)}><ArrowDown size={13} aria-hidden="true" /></button>
          </span>
          <button type="button" className={styles.remove} disabled={disabled} aria-label={`Remove ${skill}`} onClick={() => { onChange?.(skills.filter(item => item !== skill)); setAnnouncement(`${skill} removed.`); }}><X size={15} aria-hidden="true" /></button>
        </>}
      </li>)}
    </ol>
    {!locked && <>
      {!skills.length && <p className={styles.note}>Start with a skill or language you know.</p>}
      <div className={styles.picker} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
        <div className={styles.field}>
          <Plus size={16} aria-hidden="true" />
          <input ref={field} role="combobox" aria-label="Add a skill or language" aria-expanded={open && choices.length > 0} aria-controls="skill-suggestions" aria-autocomplete="list" aria-activedescendant={open && choices.length ? `skill-suggestion-${activeIndex}` : undefined} autoComplete="off" maxLength={60} disabled={disabled || full} value={query} placeholder={full ? "You’ve reached ten skills" : "Add a skill or language…"}
            onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setHighlight(0); setOpen(true); }}
            onKeyDown={event => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); if (choices.length) setHighlight((activeIndex + (event.key === "ArrowDown" ? 1 : choices.length - 1)) % choices.length); }
              else if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
              else if (event.key === "Enter") { event.preventDefault(); if (choices.length) add(choices[activeIndex]); }
            }} />
          {trimmed && !full && choices.length > 0 && <button type="button" disabled={disabled} aria-label={`Add ${choices[activeIndex]}`} onClick={() => add(choices[activeIndex])}><CornerDownLeft size={15} aria-hidden="true" /></button>}
        </div>
        {open && choices.length > 0 && !full && <div role="listbox" id="skill-suggestions" aria-label="Suggested skills" className={styles.suggestions}>
          {choices.map((skill, index) => <div key={skill} role="option" id={`skill-suggestion-${index}`} aria-selected={index === activeIndex} onMouseDown={event => event.preventDefault()} onMouseEnter={() => setHighlight(index)} onClick={() => add(skill)}><span>{skill}</span><span className={styles.optionHint}>{suggestions.includes(skill) ? "Add" : "Add your own"} +</span></div>)}
        </div>}
      </div>
      <p className={styles.note}>{duplicate && trimmed ? "That skill is already on your list." : "Up to ten in total. Remove any suggestion that doesn’t fit."}</p>
      <p className={styles.srOnly} role="status">{announcement}</p>
    </>}
  </div>;
}
