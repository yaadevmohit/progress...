/** @typedef {{breaks: number, breakMinutes: number}} PomodoroConfig */
/** @typedef {{id: string, minutes: number, startedAt: number, endsAt: number, pomodoro?: PomodoroConfig}} PlannedTimer */
/** @param {number} minutes @param {PomodoroConfig} plan */
export function validatePomodoro(minutes, plan) {
  if (!plan || !Number.isInteger(minutes) || minutes < 1 || minutes > 1440 ||
      !Number.isInteger(plan.breaks) || plan.breaks < 1 || plan.breaks > 24 || plan.breaks >= minutes ||
      !Number.isInteger(plan.breakMinutes) || plan.breakMinutes < 1 || plan.breakMinutes > 60) {
    throw new Error('Choose 1–24 breaks, fewer breaks than focus minutes, and a break duration of 1–60 minutes.');
  }
}
/** @param {PlannedTimer} timer */
export function timerPhases(timer) {
  if (!timer.pomodoro) return [{ kind: 'focus', index: 0, startedAt: timer.startedAt, endsAt: timer.endsAt,
    durationSeconds: timer.minutes * 60, key: `${timer.id}:focus:0` }];
  const count = timer.pomodoro.breaks + 1;
  const seconds = timer.minutes * 60;
  const base = Math.floor(seconds / count), remainder = seconds % count;
  let cursor = timer.startedAt;
  const phases = [];
  for (let index = 0; index < count; index++) {
    const durationSeconds = base + (index < remainder ? 1 : 0);
    phases.push({ kind: 'focus', index, startedAt: cursor, endsAt: cursor + durationSeconds * 1000,
      durationSeconds, key: `${timer.id}:focus:${index}` });
    cursor += durationSeconds * 1000;
    if (index < count - 1) {
      const durationSeconds = timer.pomodoro.breakMinutes * 60;
      phases.push({ kind: 'break', index, startedAt: cursor, endsAt: cursor + durationSeconds * 1000,
        durationSeconds, key: `${timer.id}:break:${index}` });
      cursor += durationSeconds * 1000;
    }
  }
  return phases;
}
/** @param {PlannedTimer} timer @param {number} [now] */
export function currentPhase(timer, now = Date.now()) {
  return timerPhases(timer).find((phase) => phase.endsAt > now) ?? null;
}
