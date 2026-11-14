export type Role = "Data analyst" | "Software developer";
export type Baseline = {
  applications: number; tailored: number; recruiterReach: number; networkingEvents: number;
  confidence: { powerBI: number; python: number }; preparing: boolean; practiceMinutes: number;
};
export type Application = { id: string; company: string; title: string; role: Role; fresh: boolean; contacted: boolean; tailored: boolean; skillMatch: number; status: "Applied" | "Interview" | "Closed" };
export type Person = { id: string; name: string; group: "know" | "genuine" | "building"; context: string; nextStep: string };
export type CalendarEvent = { id: string; title: string; date: string; time: string; kind: "Networking" | "Interview" | "Deadline" | "Practice"; completed: boolean };
export type Practice = { id: string; skill: string; minutes: number; note: string };
export type Goals = { applications: number; networking: number; connections: number; practice: number };
export const DEFAULT_GOALS: Goals = { applications: 10, networking: 2, connections: 3, practice: 120 };
export const DEFAULT_SKILLS = ["Python", "SQL", "Web foundations (HTML, CSS, JS)", "TypeScript", "Express", "Node.js", "React", "Next.js", "ORM"];
export const PEOPLE_GROUPS = [{ id:"know",title:"People you already know",hint:"Friends, former colleagues, classmates—start with a real relationship." },{ id:"genuine",title:"Genuine connections",hint:"People you’ve had a meaningful, two-way conversation with." },{ id:"building",title:"Relationships you’re building",hint:"People you’d like to get to know, without making every conversation an ask." }] as const;
export const CONFIDENCE = ["New to this", "Learning", "Comfortable", "Confident"];
export function applicationTotals(baseline: Baseline, applications: Application[]) {
  return { total:baseline.applications+applications.length, tailored:baseline.tailored+applications.filter(a=>a.tailored).length, reached:baseline.recruiterReach+applications.filter(a=>a.contacted).length };
}
export function effortSummary(baseline: Baseline, applications: Application[], people: Person[], events: CalendarEvent[], practice: Practice[], goals: Goals) {
  const totals=applicationTotals(baseline,applications);
  const eventsAttended=baseline.networkingEvents+events.filter(e=>e.kind==="Networking"&&e.completed).length;
  const connections=people.filter(p=>p.group==="genuine").length;
  const minutes=baseline.practiceMinutes+practice.reduce((total,entry)=>total+Math.max(0,entry.minutes),0);
  const cap=(value:number,target:number)=>Math.min(1,Math.max(0,value)/Math.max(1,target));
  // Product-defined planning weights. Recruiter/advocate contact receives more
  // weight than tailoring; this is not a measured boost in hiring probability.
  const initialIntention=.6*baseline.recruiterReach+.4*baseline.tailored;
  const detailedIntention=applications.reduce((sum,a)=>sum+.45*Number(a.contacted)+.25*Number(a.tailored)+.15*Number(a.fresh)+.15*Math.max(0,Math.min(100,a.skillMatch))/100,0);
  const intention=totals.total ? (initialIntention+detailedIntention)/totals.total : 0;
  const applicationsPoints=25*cap(totals.total,goals.applications)+25*intention;
  const relationshipsPoints=15*cap(eventsAttended,goals.networking)+10*cap(connections,goals.connections);
  const preparationPoints=25*cap(minutes,goals.practice);
  const factors=[{label:"Applications",points:applicationsPoints,max:50},{label:"Relationships",points:relationshipsPoints,max:25},{label:"Preparation",points:preparationPoints,max:25}];
  return { score:Math.round(factors.reduce((sum,f)=>sum+f.points,0)),factors,eventsAttended,connections,minutes,...totals };
}
export function validBaseline(b: Baseline) {
  return [b.applications,b.tailored,b.recruiterReach,b.networkingEvents,b.practiceMinutes].every(n=>Number.isInteger(n)&&n>=0)
    && b.applications<=500 && b.tailored<=b.applications && b.recruiterReach<=b.applications && b.networkingEvents<=100
    && [b.confidence.powerBI,b.confidence.python].every(n=>Number.isInteger(n)&&n>=1&&n<=4)
    && b.practiceMinutes<=3000 && (b.preparing || b.practiceMinutes===0);
}
export const MARKET = [
  { role:"Data analyst",category:"Database analysts & data administrators · NOC 21223",outlook:"Moderate",url:"https://www.jobbank.gc.ca/marketreport/outlook-occupation/17877/22437" },
  { role:"Software developer",category:"Software developers & programmers · NOC 21232",outlook:"Very limited",url:"https://www.jobbank.gc.ca/marketreport/outlook-occupation/22532/22437" },
];
export function torontoDate() {
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Toronto",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const part=(type:string)=>parts.find(item=>item.type===type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
