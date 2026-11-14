export type SkillTrack = { id: string; title: string; sources: string[]; description: string; recommended: boolean };
export const APPLICATION_SPLIT = [
  { role: "Data analyst", percent: 70, note: "The main application track" },
  { role: "Software developer", percent: 30, note: "A smaller, consistent second track" },
] as const;

const WEB = /^(typescript|javascript|js|html|css|react(?:\.js)?|next(?:\.js|js)?|node(?:\.js|js)?|express(?:\.js|js)?|web foundations?.*|html\s*[/,+].*)$/i;
const DATA = /^(sql|orm|prisma|drizzle|sequelize|typeorm|postgresql|postgres|mysql|sqlite|sql server|sql\s*&.*)$/i;
const PYTHON = /^(python|pandas|numpy|jupyter)$/i;

export function buildSkillPlan(skills: string[]): SkillTrack[] {
  const unique = skills.filter((skill, index) => skills.findIndex(item => item.toLowerCase() === skill.toLowerCase()) === index);
  const groups: SkillTrack[] = [];
  const web = unique.filter(skill => WEB.test(skill));
  const data = unique.filter(skill => DATA.test(skill));
  const python = unique.filter(skill => PYTHON.test(skill));
  const others = unique.filter(skill => !WEB.test(skill) && !DATA.test(skill) && !PYTHON.test(skill));
  if (web.length) groups.push({ id: "web", title: "Next.js & web development", sources: web, recommended: false, description: "One web-app learning track: practise React, TypeScript, and HTML/CSS/JS together through Next.js projects. Node and Express remain related backend tools; Express isn’t part of Next.js." });
  if (data.length) groups.push({ id: "data", title: "SQL & data access", sources: data, recommended: false, description: "Keep querying, joins, and data modelling together. An ORM helps application code access a database; it complements SQL rather than replacing it." });
  if (python.length) groups.push({ id: "python", title: "Python & analysis", sources: python, recommended: false, description: "Use Python for cleaning, exploring, and analysing data. Practise related libraries as part of the same analysis workflow." });
  if (others.length) groups.push({ id: "support", title: others.length === 1 ? others[0] : "Supporting tools & strengths", sources: others, recommended: false, description: "Keep these existing strengths together as supporting tools. They’re preserved in your plan without becoming separate daily learning commitments." });
  const has = (expression: RegExp) => unique.some(skill => expression.test(skill));
  const candidates: (SkillTrack & { exists: boolean })[] = [
    { id: "sql-add", title: "SQL & data access", sources: [], recommended: true, exists: !!data.length, description: "Build confidence with querying, joins, aggregations, and data modelling for analyst work." },
    { id: "python-add", title: "Python & analysis", sources: [], recommended: true, exists: !!python.length, description: "Practise cleaning and exploring datasets with Python, then explaining what you find." },
    { id: "bi", title: "Power BI & data visualisation", sources: [], recommended: true, exists: has(/power\s?bi|tableau|data\s*visual/i), description: "Turn analysis into clear dashboards. Start with one BI tool and practise preparing data, building measures, and choosing useful visuals." },
    { id: "excel", title: "Excel & spreadsheet analysis", sources: [], recommended: true, exists: has(/excel|spreadsheet/i), description: "Use formulas, pivot tables, and data cleaning to answer practical business questions." },
    { id: "statistics", title: "Statistics & communicating insights", sources: [], recommended: true, exists: has(/statistics|communicating insights/i), description: "Interpret results carefully and explain the business meaning behind a chart or metric." },
  ];
  const additions = candidates.filter(track => !track.exists).slice(0, Math.min(3, 6 - groups.length));
  return [...groups, ...additions.map(({ exists: _exists, ...track }) => { void _exists; return track; })];
}
