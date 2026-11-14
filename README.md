# progress..

A lunar landing page and a dashboard for tracking practice across four hobbies. The dashboard starts with mock data. Sessions you add are saved in this browser using `localStorage`. There is no database, API, or sign-in system.

## Run locally

```bash
npm ci
npm run dev
```

Open [localhost:3000/dashboard](http://localhost:3000/dashboard), or append `/dashboard` to the URL printed by Next.js. The home route (`/`) shows the lunar landing page, with a “Get started” link to the dashboard.

## Where to start reading

| File | What it does |
| --- | --- |
| [`app/layout.tsx`](app/layout.tsx) | Wraps the page in the shared header and the session timer provider. |
| [`app/page.tsx`](app/page.tsx) | Defines the lunar home route (`/`). `app/home.module.css` styles its grain and hover camera effect. `LunarStaircase.tsx` draws the monochrome lunar scene and animated climbing character. |
| [`app/dashboard/page.tsx`](app/dashboard/page.tsx) | Defines `/dashboard` and arranges the dashboard. Read this first to see where each section goes. |
| [`app/globals.css`](app/globals.css) | Loads Tailwind CSS and defines the base colors and animation keyframes. Most styling is in the components' `className` values. |
| [`app/ui/mock-data.ts`](app/ui/mock-data.ts) | Holds the four hobbies and their colors, example stats and sessions, and sample activity data. |
| [`app/ui/session-log.ts`](app/ui/session-log.ts) | Reads and saves browser sessions and tells the session list when storage changes. |
| [`app/ui/components/`](app/ui/components) | Contains the pieces of the dashboard, including the header, skill cards, heatmap, and session controls. |

At the root, `package.json` lists scripts and dependencies, and `package-lock.json` pins installed versions. The Next.js, TypeScript, ESLint, and PostCSS config files set up the development tools.

## Follow the app

1. **Open the dashboard.** Next.js renders `app/dashboard/page.tsx` inside the shared `app/layout.tsx`. Components marked `"use client"` can respond to clicks, hold React state, or use browser APIs. For example, `Header.tsx` tracks whether the mobile menu is open.
2. **Explore Activity.** `Heatmap.tsx` uses the selected year to generate a repeatable set of mock daily counts. The yearly view groups those counts by month and weekday. Click a month label or zoom in over a month to switch to one tile per day. Hover or focus a tile to see its count.
3. **Log past practice.** `LogSession.tsx` handles the hobby picker and form. The preset buttons and `DurationDial.tsx` both update the same duration value. Saving calls `saveSession`, which stores the session and notifies `RecentSessions.tsx`. That list puts saved sessions above the mock examples.
4. **Start a timer.** The form puts an active session with an end time in `SessionTimerContext.tsx`. The header and dashboard can share that state because the provider wraps both. `MostPracticed.tsx` shrinks and shows `SessionTimer.tsx`, which calculates time left from the end time. When time runs out, it saves the session the same way as the form. Cancelling clears the timer without saving.

Saved sessions survive a refresh in the same browser. An active timer only lives in memory and resets on refresh. The greeting, skill totals, streaks, and heatmap still use mock data, so logging a session only updates Recent Sessions. Log in and Sign up open blue-and-white preview forms in `AuthDialog.tsx`, with email/password validation and Google buttons. Authentication is not connected, and credentials are not saved. View all is a visual placeholder.

On screens below 768px, the homepage centers its copy and uses `public/images/lunar-mobile.webp`, a static close-up of the scene. `ResponsiveLunarScene.tsx` loads the animated SVG only on wider screens; mobile also disables animated grain and hover effects.

`HeroViewport.tsx` intercepts desktop pinch/Ctrl+wheel gestures over the hero and zooms the artwork around the pointer. It prevents browser zoom for those gestures, leaves normal scrolling alone, and provides Reset view. The mobile still keeps normal browser gestures.


The homepage’s Get started button now performs a 1.5-second space transition into `/get-started`. That route hides the shared navbar and presents a single goal question with free text, a keyboard-accessible custom picker, and a matching suggestion after five idle seconds. Matching uses local keywords from `app/get-started/goals.ts`; it does not send typed text anywhere. Confirming a goal plays a two-sentence focus interlude. The job goal continues to a career-situation question; other directions currently end at a local starting-point summary. Answers remain in page state.

`AmbientAudioProvider` sits in the root layout so sound survives navigation. `app/ui/ambient-audio.ts` synthesizes the stereo ambient tones and pulses with Web Audio. The sound button fades audio on/off; Get started adds a slow volume and pulse swell unless the user has explicitly muted sound. No audio file or external service is required.

The goal form adds a soft 72 BPM synthesized kick, snare, and hi-hat pattern when sound is enabled. A short audio-clock lookahead keeps the rhythm steady; leaving the route, muting, or disposing the audio graph stops the drum scheduler. The custom goal menu uses translucent glass styling and a glossy scrollbar, and fits above or below the field to stay inside the viewport.

Opening the unconfirmed form activates `FormLeaveGuard.tsx`: browser Back opens a custom Keep going / Leave anyway dialog while retaining the answer. Refreshing, closing a tab, and external full-page navigation use the browser’s standard `beforeunload` warning because browsers do not permit custom unload dialogs. The guard applies even before typing and stops after confirming the goal.

`GoalInterlude.tsx` shows two 4.2-second messages in order with soft Web Audio chimes when sound is enabled. The job branch uses the choices in `job-situations.ts`; the flow moves forward with upward slide transitions and no Back/Edit controls, and the leave guard remains active through both questions.

`ProgressRail.tsx` shows only questions already reached, with no total-step count or future markers. Hovering or focusing a completed line reveals its own answer summary: the first records the goal, and the career-situation line combines that goal with the selected situation. The current question has a muted marker with an Awaiting selection tooltip; it cannot open a review until confirmed. Completed lines expand on hover/focus and open locked, read-only versions of their questions; Return to current step restores the ongoing step without changing its answers.

Choosing career situation E (`exploring-paths`) opens a third question about the number of career paths. `CareerPathCount.tsx` renders 1 / 2 / 3 / 3+ as gently floating radio cards, with keyboard navigation and reduced-motion support. Confirming the count adds its summary to the growing tracker and makes it available for locked review. Other career situations keep their existing path.
