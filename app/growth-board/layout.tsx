import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Growth Board",
  description:
    "A little room for what you want to learn. Track skills and learning time, saved in your browser or synced to your account.",
};
export default function GrowthBoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
