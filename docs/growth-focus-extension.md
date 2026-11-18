# Growth Focus Chrome extension

Growth Focus is an original, Momentum-inspired new-tab dashboard connected to this repository’s Growth Board. It is a loadable Manifest V3 extension, not a Chrome Web Store publication. It uses the existing app’s local storage; it does not introduce an account or database.

## Install and connect

1. Run the updated Growth Board (`npm ci`, then `npm run dev`) or deploy this branch to your normal HTTPS app address. Open `/growth-board` and add your skills. If you already use the deployed app, connect that exact origin: localhost, www/non-www domains and different ports have different browser storage.
2. In Chrome, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `extension/growth-focus` in this repository. Accept Chrome’s new-tab replacement if prompted. Another new-tab extension may need to be disabled.
3. Open a new tab, select **Settings**, enter the app address, and choose **Connect Growth Board**. Accept the permission prompt for that specific app origin. Production addresses must use HTTPS; HTTP is permitted only on localhost and 127.0.0.1.
4. Choose a skill or subskill, duration (1–1,440 whole minutes), and optional session intention. Select **Start focus session**. The extension opens an inactive Growth Board tab if needed; keep the local dev server running if you use localhost.
5. Completed sessions appear in Growth Board’s Recent sessions, activity, skill totals and streaks. They are ordinary `source: "timer"` sessions. A five-minute break countdown appears after confirmation. Start the next session yourself; it does not run sessions unattended.
6. For private-window blocking, open the extension’s **Details** in `chrome://extensions` and enable **Allow in Incognito**. Settings shows whether Chrome has enabled that access. Start the timer from a regular new tab or the toolbar button.

To use this as the Home button’s destination as well, configure Chrome **Settings → Appearance → Show Home button → New Tab page**. For launch, choose **On startup → Open the New Tab page**. The extension replaces normal new tabs; it intentionally does not silently change a configured homepage or startup tabs.

To distribute a ZIP locally, run `npm run package:growth-focus`. Extract `build/growth-focus.zip` and load that extracted folder. The ZIP contains the manifest at its root. Reload the extension after source updates; deploy updated app code as well so the app bridge exists.

## Dashboard features

- Local clock, 12/24-hour preference, date and personalized greeting.
- “What would you like to do today?” intention, saved per local calendar date, with a completion checkbox.
- Growth Board skill/subskill picker, session notes, custom focus durations, countdown, cancellation and automatic completion.
- Five-minute break countdown after a completed session; a minimal Focus view.
- Persistent to-dos with completion/deletion and a scratchpad for notes (notes save when the field loses focus).
- Saved quick links, add/remove controls, and Google web search.
- City-based current weather in Celsius and a five-day high/low forecast from Open-Meteo; cached display while offline. Location permission is not required.
- Named event countdowns, including today and elapsed dates.
- Three illustrated landscape color themes; daily theme and original quote rotation unless personalized. Users can upload one local JPG/PNG/WebP background (up to 3 MB) and write a custom quote/mantra.
- Three local synthesized ambient sound textures. Sound is opt-in, stops when the tab closes, and plays per tab.
- Responsive layout, keyboard-accessible controls, visible focus outlines, reduced-motion support and status messages.

This is not a complete reproduction of Momentum or Momentum Plus. Its brand, proprietary photos and quotes are not copied. Calendar account integration, third-party task-manager integration, AI chat, cross-device accounts, a curated photographic feed, photo favorites, advanced air quality/hourly weather and automatic multi-round Pomodoro schedules are not implemented. Those require additional implementation and, for connected services, separate authorization. The local illustrated backgrounds and uploaded photo are distinct from a licensed daily-photo service.

## How the connection works

### App side

`app/growth-board/ExtensionBridge.tsx` mounts in the Growth Board route layout. Its browser-only effect accepts a versioned-by-channel, correlated request/response protocol from the content script. The four supported commands are `snapshot`, `start`, `finish` and `cancel`. It checks the event’s source and origin, validates command inputs, decodes saved state, and delegates mutations to the existing `storage.ts` functions.

The bridge returns only active skill IDs/names/parent IDs, the active timer and a completion acknowledgement for the requested timer ID. It does not export the board’s notes, resources, full session history or raw storage. The window message channel is not an authentication boundary against scripts already running on the connected app origin; such scripts already have access to that origin’s local storage. Protect the app origin against XSS.

### Extension side

`newtab.js` renders the standalone HTML/CSS dashboard and sends commands to the module service worker (`background.js`). Only the extension’s own new-tab page can send these runtime commands. A narrow content script (`content.js`) is injected only into the connected app tab after checking the explicitly granted host permission. It forwards the worker’s four commands, correlates responses with random IDs, and times out if the app bridge is missing.

The worker finds an existing **regular-profile** `/growth-board` tab at the configured origin or creates an inactive one. It retries loading/hydration readiness, then sends a mutation once. It does not repeat a mutation blindly when a response is lost. A later sync discovers the app’s authoritative timer.

The app remains the authority for skill validation, overlap prevention and recorded time. Existing `startTimer`, `finishTimer` and `cancelTimer` use the same validated, Web-Lock-protected storage mutations as the app UI. The extension never replaces the full app state. An app-started timer is adopted by the extension on dashboard sync or during an existing timer’s periodic reconciliation, and receives the same blocking behavior. With no extension timer and no dashboard open, the extension does not poll the board for new app timers.

### Completion and recovery

1. Starting a session creates the timer in Growth Board, then persists its ID and absolute `startedAt`/`endsAt` timestamps in `chrome.storage.local` before applying protection.
2. The display computes remaining seconds from `endsAt - Date.now()`. It does not count interval ticks, so tab throttling and closing the new-tab page do not reset elapsed time.
3. `chrome.alarms` schedules the deadline and a minute-level recovery check. Startup/install listeners recreate the watchdog and restore session rules.
4. At expiry, the worker removes blocking first and asks the app to finish that timer. The app records its planned duration and completion date using the original ID.
5. `finishTimer` already checks both sessions and retained practice credits before adding that ID. If the app’s own timer UI finished first, the bridge acknowledges the existing record. Retry does not duplicate practice or resurrect a deleted session row.
6. If the app/server cannot be reached, the expired timer remains persisted as a pending completion. Blocking ends, and the worker retries on subsequent checks and manual sync. The UI says that saving is pending; it never claims success before acknowledgement.
7. The worker serializes its commands to avoid two new tabs starting overlapping sessions. Each app mutation is separately protected by the app’s Web Lock.
8. Cancel removes the app timer without adding time. Cancel requires reaching the board; an unavailable board may prevent immediate cancellation, but network rules still expire at the original deadline. If the app cancelled or removed the timer, reconciliation does not manufacture a replacement session.

The browser must be running for alarms to execute. Chrome can delay alarms while suspended or busy. Rules may remain briefly after the nominal deadline until Chrome wakes the worker. On resume, elapsed sessions are finalized against their original deadline. These are focus-session timings, not a measurement of whether the user was physically practising while the computer slept.

## How blocking works

`core.mjs` contains editable social, entertainment and adult domain groups plus domain validation and rule generation. YouTube and its short-link/embed domains are in entertainment. Additional domains can be entered in Settings, up to 500. Categories can be enabled independently. Preferences cannot be changed through the dashboard while a timer or pending completion exists.

During an active session the worker installs `chrome.declarativeNetRequest` **session rules**. Domain matching includes subdomains. Rules block main-frame navigation, embedded frames, media, XHR/fetch, WebSockets and other requests to the listed domains. A higher-priority allow rule keeps the connected Growth Board reachable. The worker also reloads already-open matching tabs when a timer is first adopted/started, so an already-loaded entertainment page does not keep playing just because its navigation happened before focus started. Chrome displays its standard `ERR_BLOCKED_BY_CLIENT` page when navigation is blocked.

Network rules execute inside Chrome even while the service worker is suspended. They remain across worker suspension, are removed at completion/cancellation, and are restored after browser startup if the persisted timer is still active. These are intentionally session rules, so uninstalling/disabling the extension or closing Chrome cannot leave a permanent blocking ruleset behind.

`"incognito": "spanning"` uses one worker and shared extension storage for the profile. When Chrome grants incognito access, its rules cover allowed private-window requests as well. Private tabs do not read/write a separate incognito Growth Board store: the worker always syncs the regular-profile board. Private browsing URLs are not persisted, transmitted, or written into session notes. Because extension storage is shared, preferences or dashboard changes made while viewing an extension page from incognito persist in the regular profile.

### Boundaries

- Chrome does **not** allow an extension to replace its incognito new-tab page. Blocking is independent of new-tab replacement. The toolbar action opens the dashboard, and regular tabs provide the normal dashboard entry point.
- The adult list is a finite list of known domains, **not complete adult-content classification**. Unknown sites, alternate domains, proxies, nonlisted search engines or content inside otherwise allowed sites can bypass a domain list. Add missing domains; comprehensive content classification would require a maintained larger feed or a separate filtering service.
- An extension cannot prevent its owner from disabling/uninstalling it, revoking incognito permission, changing the system clock, changing extension code, using another browser/profile, or accessing native apps. It is a voluntary focus tool, not tamper-proof parental control.
- Protected browser pages and other extensions are outside this content filter. Existing cached/offline content can have browser-specific limitations. No OS-wide filtering is attempted.

## Permissions and privacy

| Permission | Purpose |
| --- | --- |
| `storage` | Persist dashboard, connected origin, active/pending timer and preferences locally. |
| `alarms` | Completion deadlines and retry checks while dashboard tabs are closed. |
| `declarativeNetRequest` | Apply focus-only domain blocking through Chrome’s network engine. |
| `scripting` | Inject the narrow bridge into the explicitly connected app origin. |
| `tabs` | Find the board and reload already-open distractions, including allowed private tabs. Chrome may label this permission “Read your browsing history”; the extension does not call the history API or save browsing URLs. |
| Optional app host | Requested only when connecting the entered HTTPS or loopback origin. Broad HTTPS patterns in the manifest allow users to choose a deployment; they are not all granted at install. |
| Open-Meteo hosts | Fetch user-requested city geocoding and weather. |

No analytics, account, remote code or background image tracking is included. Weather sends the chosen city and resulting coordinates to Open-Meteo. Web searches navigate to Google. Personal photos stay in local extension storage. The app’s progress remains in that exact origin’s local storage; use its Export function for backups. Clearing site/extension data or changing Chrome profiles does not migrate progress.

## Files, checks and manual verification

- `extension/growth-focus/manifest.json`: permissions, MV3 worker, incognito mode and new-tab override.
- `extension/growth-focus/core.mjs`: shared URL/domain validation, category lists and blocking rules.
- `extension/growth-focus/background.js`: app connection, timer lifecycle, persistent retries, alarms and rules.
- `extension/growth-focus/content.js`: isolated, correlated app message bridge.
- `extension/growth-focus/newtab.{html,css,js}`: dashboard UI, local data, weather and synthesized audio.
- `app/growth-board/ExtensionBridge.tsx`: app-side adapter using existing session mutations.
- `tests/growth-focus.test.cjs`: worker/rule tests with a mocked Chrome environment.

Run `npm run lint`, `npm run test:skills-tracker`, `npm run test:growth-focus`, `npm run build`, and `npm run package:growth-focus`.

For a release smoke test, use a disposable Chrome profile: connect an app with one skill, start a one-minute session, check YouTube plus a custom domain in normal and permitted incognito windows, close the dashboard, and verify exactly one session in the board after completion. Test cancellation, app-origin permission revocation, browser restart, offline server/reconnect and an existing YouTube tab. Verify dashboard settings, tasks, links, notes, weather, photo upload and mobile-width layout. Incognito access is always an explicit browser setting; the extension cannot enable it on the user’s behalf.

References: [Chrome new-tab overrides](https://developer.chrome.com/docs/extensions/develop/ui/override-chrome-pages), [incognito modes](https://developer.chrome.com/docs/extensions/reference/manifest/incognito), [network rules](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest), [permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions), [Open-Meteo API](https://open-meteo.com/en/docs).

### Verification performed for this implementation

- ESLint and the Next.js production build passed.
- 35 app/model/storage/bridge tests and 12 extension worker/rule tests passed (47 total).
- The production manifest loaded in an isolated Brave/Chromium 157 profile with no install warnings, manifest errors or runtime errors. Its real desktop and narrow layouts were inspected.
- A separate disposable integration copy pre-granted **only localhost** as a required host permission to bypass the native permission prompt in headless mode. The shipped manifest retains optional app access. With the updated local app, the real extension loaded a Piano skill, started a one-minute timer, installed network rules, blocked an actual YouTube navigation in both normal and permitted private browser contexts, and recorded exactly one 60-second timer session in Growth Board. The UI then showed a confirmed save and the break countdown. A real to-do submission also persisted successfully.
- Full interactive Chrome installation/permission-prompt acceptance, external HTTPS deployment, weather network availability and the full list of browser-specific offline/cache cases remain manual release checks. No Chrome Web Store publication or production app deployment was performed.
