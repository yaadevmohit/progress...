export const CAREER_SECTORS = [
  { id: "technology", label: "Information technology", jobs: ["Software developer", "Data analyst", "Cybersecurity analyst", "Cloud engineer", "IT support specialist", "UX designer"] },
  { id: "health", label: "Health & wellbeing", jobs: ["Registered nurse", "Physiotherapist", "Mental health counsellor", "Dietitian", "Medical researcher", "Occupational therapist"] },
  { id: "business", label: "Business & finance", jobs: ["Financial analyst", "Accountant", "Business analyst", "Project manager", "Marketing specialist", "Entrepreneur"] },
  { id: "creative", label: "Design & media", jobs: ["Graphic designer", "Animator", "Writer", "Video producer", "Photographer", "Art director"] },
  { id: "engineering", label: "Engineering & trades", jobs: ["Mechanical engineer", "Civil engineer", "Electrician", "Architect", "Robotics engineer", "Renewable energy technician"] },
  { id: "people", label: "Education & community", jobs: ["Teacher", "Social worker", "Career counsellor", "Learning designer", "Community organiser", "HR specialist"] },
] as const;

export function careerInterestsSummary(selected: string[]) {
  return selected.length ? `You’re interested in exploring ${selected.join(", ")}.` : "You’re exploring sectors and the careers within them.";
}
