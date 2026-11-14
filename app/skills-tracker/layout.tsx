import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Skills Tracker",
  description:
    "A little room for what you want to learn. Track skills and learning time, saved in your browser.",
};
export default function SkillsTrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
