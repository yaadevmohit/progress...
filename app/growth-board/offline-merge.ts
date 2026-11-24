import { COLORS, decodeTracker, isActiveSkill, MAX_SKILLS, type TrackerState } from "./model";
export type ConflictChoice = "device" | "server";
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => sameValue(v, b[i]));
  const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(k => Object.hasOwn(right, k) && sameValue(left[k], right[k]));
}
export function mergeBoards(base: TrackerState, device: TrackerState, server: TrackerState, choice?: ConflictChoice) {
  const conflicts: string[] = [];
  function field<T>(before: T, local: T, remote: T, path: string): T {
    if (sameValue(local, before)) return remote;
    if (sameValue(remote, before) || sameValue(local, remote)) return local;
    conflicts.push(path);
    return choice === "server" ? remote : local;
  }
  function rows<T extends { id: string }>(before: T[], local: T[], remote: T[], path: string): T[] {
    const b = new Map(before.map(v => [v.id, v])), l = new Map(local.map(v => [v.id, v])), r = new Map(remote.map(v => [v.id, v]));
    return [...new Set([...r.keys(), ...l.keys(), ...b.keys()])].flatMap(id => {
      const old = b.get(id), mine = l.get(id), online = r.get(id);
      if (!old || !mine || !online) {
        const result = field(old, mine, online, `${path}/${id}`);
        return result ? [result] : [];
      }
      const result = { ...online } as Record<string, unknown>;
      for (const key of new Set([...Object.keys(old), ...Object.keys(mine), ...Object.keys(online)])) {
        const a = old as Record<string, unknown>, x = mine as Record<string, unknown>, y = online as Record<string, unknown>;
        if (key === "resources") {
          result[key] = rows((a[key] ?? []) as { id: string }[], (x[key] ?? []) as { id: string }[], (y[key] ?? []) as { id: string }[], `${path}/${id}/resources`);
        } else {
          const value = field(a[key], x[key], y[key], `${path}/${id}/${key}`);
          if (value === undefined) delete result[key]; else result[key] = value;
        }
      }
      return [result as T];
    });
  }
  const skills = rows(base.skills, device.skills, server.skills, "skills");
  const skillIds = new Set(skills.map(s => s.id));
  const deleted = new Set([...(server.deletedSessionIds ?? []), ...(device.deletedSessionIds ?? [])]);
  const sessions = rows(base.sessions, device.sessions, server.sessions, "sessions").filter(s => !deleted.has(s.id));
  const orphans = sessions.filter(s => !skillIds.has(s.skillId));
  if (orphans.length) {
    conflicts.push("A skill was deleted while practice was logged for it.");
    if (choice !== "server") {
      // Recover the locally used branch only when choosing device edits.
      const recover = (id: string) => {
        if (skillIds.has(id)) return;
        const skill = device.skills.find(s => s.id === id);
        if (skill) { if (skill.parentId) recover(skill.parentId); skills.push(skill); skillIds.add(id); }
      };
      orphans.forEach(s => recover(s.skillId));
    } else orphans.forEach(s => deleted.add(s.id));
  }
  // Concurrent additions may choose the same free slot. Keep both IDs and move
  // only colliding root slots; names, sessions, and resource links stay intact.
  const occupied = new Set<number>();
  for (let i = 0; i < skills.length; i++) {
    const skill = skills[i];
    if (skill.parentId || !isActiveSkill(skill)) continue;
    if (occupied.has(skill.slot)) {
      const slot = Array.from({ length: MAX_SKILLS }, (_, n) => n).find(n => !occupied.has(n));
      if (slot === undefined) throw new Error("More than six skills would be active after syncing. Archive a skill on this board and retry.");
      skills[i] = { ...skill, slot, color: COLORS[slot] };
    }
    occupied.add(skills[i].slot);
  }
  let activeTimer = field(base.activeTimer, device.activeTimer, server.activeTimer, "active timer");
  if (activeTimer && !skillIds.has(activeTimer.skillId)) {
    conflicts.push("The running timer's skill was deleted.");
    activeTimer = null;
  }
  const candidate: TrackerState = {
    version: 1, skills, sessions: sessions.filter(s => !deleted.has(s.id)),
    deletedSessionIds: [...deleted], activeTimer,
    reminderDismissedAt: field(base.reminderDismissedAt, device.reminderDismissedAt, server.reminderDismissedAt, "reminder"),
  };
  const parsed = decodeTracker(JSON.stringify(candidate));
  if (parsed.error) throw new Error("The combined boards have incompatible skill names or relationships. Adjust this board and retry syncing; your offline changes are still saved.");
  return { state: parsed.state, conflicts: choice ? [] : conflicts };
}
