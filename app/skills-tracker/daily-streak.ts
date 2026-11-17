const KEY = "progress.skills-tracker.streak-celebrated-day";
const seen = new Set<string>();

// Keep this separate from learning data so a celebration never changes progress.
export function claimDailyStreak(day: string) {
  if (seen.has(day)) return false;
  seen.add(day);
  try {
    if (localStorage.getItem(KEY) === day) return false;
    localStorage.setItem(KEY, day);
  } catch {
    // Still avoid repeats during this visit when browser storage is unavailable.
  }
  return true;
}
