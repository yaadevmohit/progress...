import { buildSkillPlan } from "./skill-plan";

export type DirectionAnswers = {
  priority: string[];
  interest: string;
  ease: string;
  progress: string;
  outside: string[];
  motivation: string;
  balance: string;
  splitConfirmed: boolean;
  planConfirmed: boolean;
};
export const EMPTY_DIRECTION: DirectionAnswers = { priority: [], interest: "", ease: "", progress: "", outside: [], motivation: "", balance: "", splitConfirmed: false, planConfirmed: false };
export const DIRECTION_LABELS = ["Your priorities", "Comparing your paths", "What draws you in", "Learning feels", "Your momentum", "Beyond the job search", "Interest or practicality", "Making room for both", "Your workspace draft", "Your 70/30 approach", "A smaller skills plan"];

export function directionSummary(step: number, a: DirectionAnswers, roles: string[], skills: string[] = []) {
  switch (step) {
    case 0: return `Your career priorities: ${(a.priority.length ? a.priority : roles).join(" → ")}.`;
    case 1: return `You’re considering ${roles.join(" and ")}. You’re separating interest, learning effort, and progress before deciding how to approach each path.`;
    case 2: return `${a.interest} currently feels more interesting to you.`;
    case 3: return `${a.ease} feels easier to learn.`;
    case 4: return `You feel you’ve made the most progress in ${a.progress}.`;
    case 5: return a.outside.length ? `Outside work, you’re drawn to ${a.outside.join(" and ")}. These interests are not job-search targets.` : "You haven’t added interests outside the job search.";
    case 6: return a.motivation === "yes" ? "At least one of these careers feels personally meaningful to you." : a.motivation === "no" ? "These careers feel more like practical options than paths you genuinely want to pursue." : "You’re still figuring out how much genuine interest you feel in these careers.";
    case 7: return a.balance === "agree" ? "You want practicality to support your decision without outweighing personal interest." : a.balance === "stability" ? "Financial stability needs to lead for now, while you keep space for personal interests." : "You want to explore the trade-off between interest and practicality further.";
    case 9: return "Your application focus is 70% Data analyst and 30% Software developer. This is a starting approach, not a prediction of job outcomes.";
    case 10: return `Your consolidated focus areas: ${buildSkillPlan(skills).map(track => track.title).join(", ")}. Your original skills are preserved inside these tracks.`;
    default: return `Your workspace draft includes ${roles.join(" and ")}, with your priorities and interests kept distinct.`;
  }
}
