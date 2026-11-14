"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { DEFAULT_SKILLS, type Baseline } from "./model";
type Profile = { skills: string[]; priority: string[]; baseline?: Baseline };
const ProfileContext = createContext<{ profile: Profile; setProfile: (profile: Profile) => void }>({ profile: { skills: DEFAULT_SKILLS, priority: ["Data analyst", "Software developer"] }, setProfile: () => {} });
export function JobHuntProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>({ skills: DEFAULT_SKILLS, priority: ["Data analyst", "Software developer"] });
  return <ProfileContext.Provider value={{profile,setProfile}}>{children}</ProfileContext.Provider>;
}
export function useJobHuntProfile() { return useContext(ProfileContext); }
