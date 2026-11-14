"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useJobHuntProfile } from "./ProfileContext";
import styles from "./page.module.css";
export default function OpenWorkspace({ skills, priority }: { skills: string[]; priority: string[] }) {
  const { setProfile } = useJobHuntProfile();
  return <Link href="/job-hunt" className={styles.openWorkspace} onClick={() => setProfile({skills:[...skills],priority:[...priority]})}>A few final details, then your workspace <ArrowUpRight size={17} aria-hidden="true" /></Link>;
}
