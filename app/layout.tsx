import type { Metadata } from "next";
import "./globals.css";
import Header from "./ui/components/Header";
import { SessionTimerProvider } from "./ui/components/SessionTimerContext";

export const metadata: Metadata = {
  title: "LearnersLog",
  description: "app for tracking your learning progress",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SessionTimerProvider>
          <Header />
          {children}
        </SessionTimerProvider>
      </body>
    </html>
  );
}
