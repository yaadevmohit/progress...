export const SEED_TAG = 'growth-board-mock-v1';
export const USER_COUNT = 1000;
const DAY = 86400000;
const firstNames = ['Avery', 'Jordan', 'Morgan', 'Riley', 'Casey', 'Taylor', 'Alex', 'Sam', 'Jamie', 'Cameron', 'Drew', 'Robin', 'Skyler', 'Quinn', 'Reese', 'Rowan', 'Sage', 'Emery', 'Blair', 'Finley'];
const lastNames = ['Chen', 'Patel', 'Garcia', 'Wilson', 'Kim', 'Singh', 'Martin', 'Brown', 'Ali', 'Lee', 'Silva', 'Nguyen', 'Clark', 'Lopez', 'Walker', 'Scott', 'Young', 'Adams', 'Baker', 'Hall', 'Rivera', 'Green', 'Hill', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Phillips', 'Evans', 'Turner', 'Parker', 'Collins', 'Edwards', 'Stewart', 'Morris', 'Rogers', 'Reed', 'Cook', 'Bell', 'Murphy', 'Bailey', 'Cooper', 'Richardson', 'Cox', 'Howard', 'Ward', 'Torres', 'Peterson', 'Gray', 'Ramirez'];
const tracks = [
  ['JavaScript', 'React', 'SQL', 'TypeScript'],
  ['Drawing', 'Watercolour', 'Photography', 'Design'],
  ['Spanish', 'French', 'Japanese', 'Writing'],
  ['Piano', 'Guitar', 'Music theory', 'Singing'],
  ['Python', 'Statistics', 'Data analysis', 'Machine learning'],
  ['Public speaking', 'Leadership', 'Project management', 'Communication'],
];
const colors = ['#640D5F', '#B12C00', '#EB5B00', '#090040', '#471396', '#B13BFF'];
export function profile(index) {
  if (!Number.isInteger(index) || index < 0 || index >= USER_COUNT) throw new Error('Invalid mock user index');
  return { email: `growth.mock.${String(index + 1).padStart(4, '0')}@example.com`, name: `${firstNames[index % 20]} ${lastNames[Math.floor(index / 20)]}` };
}
export function makeBoard(index, anchorDay) {
  profile(index);
  const end = Date.parse(`${anchorDay}T12:00:00Z`);
  if (!Number.isFinite(end) || new Date(end).toISOString().slice(0, 10) !== anchorDay) throw new Error('Invalid anchor day');
  // Calendar months, clamped for shorter months (including leap years).
  const months = 1 + Math.floor(index * 24 / USER_COUNT);
  const target = new Date(end);
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(new Date(end).getUTCDate(), lastDay));
  const start = target.getTime();
  const span = Math.round((end - start) / DAY);
  const track = tracks[index % tracks.length];
  const skills = track.slice(0, 2 + index % 3).map((name, slot) => ({
    id: `skill-${slot}`, name, slot, color: colors[slot], status: 'active', createdAt: new Date(start).toISOString(),
  }));
  let randomState = index + 1;
  const random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; };
  const sessions = [];
  // Roughly 1–3 practices per week, plus both endpoints, keeping history compact.
  const frequency = (1 + index % 3) / 7;
  for (let day = 0; day <= span; day++) {
    if (day !== 0 && day !== span && random() > frequency) continue;
    const date = new Date(start + day * DAY).toISOString();
    sessions.push({ id: `session-${day}`, skillId: skills[Math.floor(random() * skills.length)].id,
      durationSeconds: [900, 1500, 1800, 2700, 3600][Math.floor(random() * 5)],
      activityDate: date.slice(0, 10), notes: '', source: random() < 0.4 ? 'timer' : 'recorded',
      createdAt: date, timeZone: 'UTC' });
  }
  sessions.reverse();
  return { version: 1, skills, sessions, activeTimer: null, reminderDismissedAt: null };
}
export function seedSummary(anchorDay) {
  let bytes = 0, sessions = 0, maxBoardBytes = 0;
  for (let index = 0; index < USER_COUNT; index++) {
    const board = makeBoard(index, anchorDay);
    const size = Buffer.byteLength(JSON.stringify(board));
    bytes += size;
    sessions += board.sessions.length;
    maxBoardBytes = Math.max(maxBoardBytes, size);
  }
  if (bytes > 32 * 1024 ** 2 || maxBoardBytes > 512 * 1024) throw new Error('Mock data exceeds seed storage budget');
  return { users: USER_COUNT, sessions, boardBytes: bytes, maxBoardBytes, historyMonths: [1, 24], fileStorageBytes: 0 };
}
