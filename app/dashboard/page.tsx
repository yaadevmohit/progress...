import AccountVisibility from "@/app/auth/SignInRequired";
import UserGreeting from "@/app/ui/components/UserGreeting";
import MostPracticed from "@/app/ui/components/MostPracticed";
import SkillCard from "@/app/ui/components/SkillCard";
import Heatmap from "@/app/ui/components/Heatmap";
import RecentSessions from "@/app/ui/components/RecentSessions";
import { HOBBIES, SKILL_STATS } from "@/app/ui/mock-data";

export default function Dashboard() {
  return (
    <AccountVisibility><main className="mx-auto w-full max-w-[75rem] px-4 pb-8 sm:px-6">
      {/* The header occupies 69px above the desktop overview. */}
      <div className="flow-root md:min-h-[calc(100svh-69px)]">
        <UserGreeting />
        <div className="grid gap-4 md:grid-cols-3">
          <MostPracticed />
          <div className="min-w-0 space-y-4 md:col-span-2">
            <div className="grid gap-3 sm:grid-cols-3">
              {SKILL_STATS.map((skill) => (
                <SkillCard key={skill.name} {...skill} color={HOBBIES[skill.name]} />
              ))}
            </div>
            <Heatmap />
          </div>
        </div>
      </div>
      <div className="mt-4">
        <RecentSessions />
      </div>
    </main></AccountVisibility>
  );
}
