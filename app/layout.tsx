import { JobHuntProfileProvider } from "./job-hunt/ProfileContext";
import type { Metadata } from "next";
import Script from "next/script";
import { TRACKER_THEME_SCRIPT } from "./skills-tracker/theme-config";
import localFont from "next/font/local";
import "./globals.css";
import { AmbientAudioProvider } from "./ui/components/AmbientAudio";
import Header from "./ui/components/Header";
import { SessionTimerProvider } from "./ui/components/SessionTimerContext";

const nunito = localFont({
  src: [
    { path: "./fonts/Nunito-Variable.ttf", weight: "200 900", style: "normal" },
    { path: "./fonts/Nunito-Italic-Variable.ttf", weight: "200 900", style: "italic" },
  ],
  variable: "--font-nunito",
  display: "swap",
});

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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="skills-tracker-theme" strategy="beforeInteractive">
          {TRACKER_THEME_SCRIPT}
        </Script>
        <AmbientAudioProvider>
        <JobHuntProfileProvider>
        <SessionTimerProvider>
          <Header />
          {children}
        </SessionTimerProvider>
        </JobHuntProfileProvider>
        </AmbientAudioProvider>
      </body>
    </html>
  );
}
