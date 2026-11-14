// Local suggestions for this prototype. No requests or database connection.
export const INITIAL_SKILLS = ["Python", "SQL", "Web foundations (HTML, CSS, JS)", "Linux / Unix commands"];
export const SKILL_LIMIT = 10;
export const SKILL_DATASET = [
  { name: "Python", aliases: ["python", "py"] },
  { name: "SQL", aliases: ["sql", "databases", "queries"] },
  { name: "Web foundations (HTML, CSS, JS)", aliases: ["html", "css", "javascript", "js", "web foundations"] },
  { name: "Linux / Unix commands", aliases: ["linux", "unix", "shell", "bash", "terminal", "command line"] },
  ...["TypeScript", "React", "Next.js", "Node.js", "Express", "ORM", "Prisma", "Java", "C", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin", "R", "Git", "Docker", "Kubernetes", "AWS", "Azure", "Google Cloud", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Excel", "Power BI", "Tableau", "Pandas", "NumPy", "Jupyter", "Statistics", "Data visualisation", "Data modelling", "Machine learning", "TensorFlow", "PyTorch", "REST APIs", "GraphQL", "Testing", "Algorithms", "Data structures", "Figma", "Communication", "Problem solving"].map(name => ({ name, aliases: [name.toLowerCase()] })),
];

export function suggestSkills(query: string, selected: string[]) {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  return SKILL_DATASET.filter(skill => !selected.some(item => item.toLowerCase() === skill.name.toLowerCase()) && [skill.name.toLowerCase(), ...skill.aliases].some(label => label.includes(term)))
    .sort((a, b) => Number(b.name.toLowerCase().startsWith(term)) - Number(a.name.toLowerCase().startsWith(term)))
    .slice(0, 5).map(skill => skill.name);
}

export function skillsSummary(skills: string[]) {
  return skills.length ? `From most to least familiar: ${skills.join(" → ")}.` : "You’re putting your skills in order of familiarity.";
}
