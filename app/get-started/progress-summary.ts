const GOAL_SUMMARIES: Record<string, string> = {
  "I’m still figuring it out": "You’re giving yourself room to figure out what you want.",
  "Find a job that fits me": "You’re looking for a job that fits you.",
  "Explore a new career path": "You’re exploring a new direction for your career.",
  "Find focus and follow through": "You want to find focus and follow through on what matters to you.",
  "Build confidence and meaningful connections": "You want to build confidence and make meaningful connections.",
  "Bring more balance to my days": "You want more balance in your everyday life.",
  "Feel better, physically and mentally": "You want to feel better, physically and mentally.",
  "Learn something I’ve always wanted to": "You want to make space for something you’ve always wanted to learn.",
  "Bring a personal project to life": "You want to bring a personal project to life.",
  "Make room for what matters to me": "You want to make room for what matters most to you.",
};

export function goalSummary(goal: string) {
  const answer = goal.trim();
  if (!answer) return "Your starting point: choose what you’d like to focus on.";
  return GOAL_SUMMARIES[answer] ?? `Your goal is “${answer}”.`;
}
