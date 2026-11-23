import type { Metadata } from "next";
import BoardDataProvider from "./BoardDataProvider";
import ExtensionBridge from "./ExtensionBridge";
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
  return <BoardDataProvider><ExtensionBridge />{children}</BoardDataProvider>;
}
