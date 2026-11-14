# Skills Tracker: proposed database design

This is a design only. The running tracker uses browser local storage under `progress.skills-tracker.v1`. There is no database connection, authentication, or cloud sync. The SQL beside this file is illustrative and is not a migration.

```mermaid
erDiagram
  USERS ||--o{ SKILLS : owns
  USERS ||--o{ LEARNING_SESSIONS : logs
  SKILLS ||--o{ LEARNING_SESSIONS : receives
  SKILLS ||--o{ SKILL_RESOURCES : collects
  SKILLS ||--o{ TIMER_RUNS : times
  USERS ||--o| USER_PREFERENCES : configures
```

## The records

| Table | Purpose | Example |
| --- | --- | --- |
| `users` | Future account and preferred time zone | A learner in America/Toronto |
| `skills` | A named skill, its card slot and colour | Spanish, slot 0 |
| `skill_resources` | Optional named links, many per skill | A course and a reference guide |
| `learning_sessions` | The source of truth for learning progress | Spanish, 25 minutes, November 14 |
| `timer_runs` | A running timer and its deadline | Started 14:00, ends 14:25 |
| `user_preferences` | When the reminder was dismissed | Hide it for another 48 hours |

A skill can have many sessions. Every session belongs to the same user as its skill; the composite foreign key enforces this. A completed timer creates one session using the timer's ID, preventing duplicate completion across tabs.

The six-skill limit is per user, not a limit on sessions. Database checks cannot count other rows safely: a future server must lock the user's row in a transaction, count their skills, and insert only when fewer than six exist. The draft trigger shows this rule. Card slots 0–5 and a unique `(user_id, slot)` constraint also enforce the six-slot layout. No archive/delete flow is implemented yet.

## Calculate progress instead of storing counters

- **Hours per skill:** sum its sessions' `duration_seconds`.
- **Most practised:** the skill with the largest total. Ties use the oldest skill, then its slot.
- **Overall streak:** consecutive distinct `activity_date` values across all skills. Multiple sessions on one day count once. Yesterday's streak stays alive until the end of today; after a missed full day it resets.
- **Individual streak:** the same calculation filtered to one skill.
- **Weekly heatmap:** sum learning time for each Monday–Sunday week. The displayed month boundaries clip the first and last weeks; tooltips show the actual interval. With no sessions the current month appears; otherwise the current and previous two months appear. Arrow controls move the window by one month. The monthly scale becomes available when the history spans a calendar-month boundary, and the annual scale after twelve calendar months. These scales aggregate actual time by month and year; clicking a bucket returns to a finer scale. Navigation is bounded by the earliest saved skill creation date or logged activity date, since there is no account creation date yet.

Dates are calendar dates, while timestamps are instants. Logging uses the browser's local date and records its time zone. A timer records the scheduled completion date in the browser's current local time; an early finish records actual elapsed time (minimum one minute). Timers span reloads and are recovered when the tracker is reopened. If a timer crosses midnight, its time is assigned to the completion day rather than split between days.

## Current app files

| File | Responsibility |
| --- | --- |
| `app/skills-tracker/page.tsx` | Dedicated header, skill cards, totals, greeting streak and timer |
| `app/skills-tracker/ActivityChart.tsx` | Adaptive weekly, monthly and annual activity scales with drill-down and bounded navigation |
| `app/skills-tracker/PracticeDonut.tsx` | Time distribution across skills, with colours matched to card dots |
| `app/skills-tracker/ThemeToggle.tsx` | Animated light/dark switch, with a separate local preference and cross-tab updates |
| `app/skills-tracker/StreakFlame.tsx` | Active streak glow and increase animation, respecting reduced motion |
| `app/skills-tracker/SkillResources.tsx` | Resource section for each card: add, open and remove named learning links |
| `app/skills-tracker/SkillComposer.tsx` | Inline skill creation, reused in cards and the session form |
| `app/skills-tracker/SessionDialog.tsx` | Log time or start a timer, with a custom skill picker |
| `app/skills-tracker/model.ts` | Data types, validation and progress calculations |
| `app/skills-tracker/storage.ts` | Local storage subscriptions, writes, timer recovery and backup export |
| `app/skills-tracker/tracker.module.css` | White/green styling, responsive layout and motion |

The original mock `/dashboard` remains separate. The new tracker starts empty and never imports mock sessions. Web Locks serialize writes between tabs where supported; browsers without Web Locks use synchronous writes (simultaneous cross-tab edits may conflict). Corrupt saved data is not silently replaced. Use the download icon to export the stored JSON as a backup. There is no import screen yet.

The dismissible sync reminder returns 48 hours after dismissal while the tracker is open or on the next visit. It is an in-app hint, not a system notification. It explicitly says that sign-in and sync are coming soon. Clearing this site's browser data removes the tracker.

## Later, when accounts exist

The server will derive `user_id` from a verified session, never trust one sent by the client, and authorize every read and write. Account ownership and provider credentials belong in the future authentication system. Before connecting this schema, plan local-data import, conflicts, backups, deletion, and row-level access policies. None of those services are active now.

Learning resources are optional and saved with each skill in local storage. Older saves without a `resources` field remain valid. The resource section supports multiple links, opens them in a new tab, and lets you remove saved links. Only HTTP/HTTPS URLs without embedded credentials are accepted. Resources do not affect learning totals or streaks.

The skill grid displays existing cards in saved order followed by exactly one Add a skill card, until all six slots are used. The donut only allocates segments to skills with recorded learning time; its centre shows total learning time and the leading skill remains named below. Flame icons are orange for active streaks, flare when a count increases during use, and do not celebrate initial hydration of saved data.

The tracker palette lives in CSS variables in `tracker.module.css`: yellow surfaces, red/brown text and warm chart colours. The header Log session button retains its green styling. The shared duration dial accepts scoped CSS colour variables, with green defaults for the original dashboard.

Dark mode uses `#0B1D51` as its background, lighter navy surfaces, pale text and gold accents. The preference is saved separately under `progress.skills-tracker.theme`; the root layout restores it before hydration to avoid a bright light-theme flash. Dark styling is scoped to the tracker, and dialogs, charts and native date fields follow the same theme. The navbar toggle works with keyboard input and respects reduced-motion preferences. Recent sessions follow the content directly, without a viewport-height spacer.
