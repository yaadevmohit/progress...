export const HOBBIES = {
  Spanish: "#059669",
  Guitar: "#8B5CF6",
  TypeScript: "#3B82F6",
  Cooking: "#EF4444",
};

export type Hobby = keyof typeof HOBBIES;

export const MOST_PRACTICED = {
  name: "Spanish",
  totalHours: "47.5h",
  streak: 12,
  percentOfGoal: 75,
  lastSession: "Yesterday · 45 min",
};

export const SKILL_STATS = [
  { name: "Guitar", totalHours: "32h", streak: 8 },
  { name: "TypeScript", totalHours: "18h", streak: 3 },
  { name: "Cooking", totalHours: "12h", streak: 5 },
] satisfies { name: Hobby; totalHours: string; streak: number }[];

export const RECENT_SESSIONS = [
  {
    id: "1",
    skill: "Spanish",
    notes: "Practiced past tense conjugations. Struggled with irregular verbs.",
    duration: "45 min",
    date: "Today",
  },
  {
    id: "2",
    skill: "Guitar",
    notes: "Fingerpicking exercises and chord transitions for new song.",
    duration: "60 min",
    date: "Today",
  },
  {
    id: "3",
    skill: "TypeScript",
    notes: "Deep dive into generic constraints and mapped types.",
    duration: "45 min",
    date: "Yesterday",
  },
  {
    id: "4",
    skill: "Cooking",
    notes: "Practiced knife skills and French mother sauce reductions.",
    duration: "60 min",
    date: "Yesterday",
  },
  {
    id: "5",
    skill: "Spanish",
    notes: "Conversational practice with language exchange partner.",
    duration: "30 min",
    date: "2 days ago",
  },
] satisfies { id: string; skill: Hobby; notes: string; duration: string; date: string }[];

export const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];
const DAY_MS = 86_400_000;

// Each entry is a mock week of daily activity counts, starting on Monday.
const WEEKS = [
  [0, 1, 0, 0, 1, 0, 0],
  [0, 0, 1, 0, 1, 0, 0],
  [1, 0, 0, 1, 0, 0, 1],
  [0, 1, 0, 0, 1, 1, 0],
  [0, 0, 1, 0, 0, 0, 0],
  [1, 0, 0, 1, 0, 0, 0],
  [0, 1, 0, 0, 0, 1, 0],
  [0, 0, 1, 0, 0, 0, 1],
  [0, 0, 0, 0, 1, 0, 0],
  [0, 1, 0, 1, 0, 0, 0],
  [1, 0, 0, 0, 1, 0, 1],
  [0, 1, 1, 0, 1, 0, 0],
  [1, 0, 1, 1, 0, 1, 0],
  [1, 1, 0, 1, 1, 0, 1],
  [2, 1, 2, 1, 1, 2, 1],
  [2, 1, 2, 3, 2, 3, 2],
  [3, 2, 3, 2, 3, 4, 3],
  [3, 4, 3, 4, 3, 4, 4],
  [4, 2, 3, 1, 4, 3, 2],
  [2, 0, 3, 4, 4, 1, 3],
  [3, 4, 2, 4, 3, 4, 4],
  [4, 3, 4, 4, 2, 4, 3],
  [3, 2, 4, 3, 1, 4, 4],
  [4, 4, 3, 2, 4, 3, 2],
  [3, 1, 4, 4, 2, 4, 3],
  [4, 3, 4, 2, 4, 1, 4],
];

export const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function getActivityMonths(year: number) {
  const yearStart = Date.UTC(year, 0, 1);
  const firstWeekday = (new Date(yearStart).getUTCDay() + 6) % 7;
  const yearOffset = YEARS[0] - year;
  return MONTH_LABELS.map((_, month) => {
    const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    return Array.from({ length: days }, (_, index) => {
      const date = new Date(Date.UTC(year, month, index + 1));
      const dayOffset = (date.getTime() - yearStart) / DAY_MS + firstWeekday;
      const weekday = dayOffset % 7;
      const week = Math.floor(dayOffset / 7);
      const sampleIndex = (week * 7 + Math.floor(week / WEEKS.length) + yearOffset * 3) % WEEKS.length;
      return { date, weekday, count: WEEKS[sampleIndex][weekday] };
    });
  });
}
