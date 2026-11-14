export const GOALS = [
  { label: "I’m still figuring it out", keywords: ["don't know", "dont know", "unsure", "uncertain", "lost", "figure", "direction", "confused", "not sure"] },
  { label: "Find a job that fits me", keywords: ["job", "work", "employment", "hire", "hired", "resume", "interview", "unemployed"] },
  { label: "Explore a new career path", keywords: ["career", "switch", "change career", "transition", "profession", "pivot"] },
  { label: "Find focus and follow through", keywords: ["focus", "concentrate", "distract", "procrastinat", "productive", "productivity", "discipline", "finish"] },
  { label: "Build confidence and meaningful connections", keywords: ["social", "friend", "connect", "confidence", "shy", "people", "socializ", "relationship", "lonely", "network"] },
  { label: "Bring more balance to my days", keywords: ["balance", "overwhelm", "stress", "organize", "organise", "routine", "busy", "control", "time management"] },
  { label: "Feel better, physically and mentally", keywords: ["health", "fitness", "exercise", "sleep", "wellbeing", "well-being", "mental", "energy", "feel better"] },
  { label: "Learn something I’ve always wanted to", keywords: ["learn", "study", "skill", "language", "course", "education", "practice"] },
  { label: "Bring a personal project to life", keywords: ["project", "create", "build", "business", "launch", "idea", "write", "start"] },
  { label: "Make room for what matters to me", keywords: ["purpose", "meaning", "priorit", "passion", "fulfil", "fulfill", "matter"] },
];

export function recommendGoal(input: string) {
  const query = input.toLowerCase().replace(/[’]/g, "'").trim();
  if (query.length < 3) return null;
  const matches = GOALS.map((goal) => ({
    label: goal.label,
    score: goal.keywords.reduce((score, keyword) => score + (query.includes(keyword) ? keyword.length : 0), 0),
  })).sort((a, b) => b.score - a.score);
  return matches[0].score > 0 && matches[0].label !== input ? matches[0].label : null;
}
