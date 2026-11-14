export function skillsReflection(count: number) {
  if (count <= 1) return [
    "You may have other skills you haven’t listed. There’s no need to capture everything right now.",
    "One skill is a clear starting point. Give yourself room to build confidence at a sustainable pace.",
    "Later, we’ll build a manageable learning path around this skill and suggest in-demand skills to help you become a stronger candidate.",
  ];
  return [
    `You may be familiar with more than the ${count} skills you’ve listed. You don’t need to take them all on at once.`,
    `These ${count} skills give us a useful starting point—not ${count} things you need to work on every day.`,
    "A smaller focus can make steady progress feel more manageable, with room to rest instead of pushing yourself towards burnout.",
    "Later, we’ll merge related tech skills into manageable learning tracks and suggest in-demand skills to help you become a stronger candidate.",
  ];
}
