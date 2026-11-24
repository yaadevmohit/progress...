# Signed-in offline sync

Signed-in boards normally live in memory and Postgres. Successful online loads and saves do not keep a full account board in localStorage. Supabase's session metadata and theme preferences still use their existing storage; guests continue to use their browser board.

When the open board loses internet connectivity, the app saves an account-scoped offline envelope in `progress.skills-tracker.v1.user.<user-id>.offline` and displays a connection notice. It contains the last acknowledged database board (the baseline) and the current locally edited board. Storage is written before an offline edit is acknowledged. If storage is blocked or full, the edit reports an error instead of pretending it was saved.

On reconnect, app focus, or a retry every 15 seconds while an offline envelope exists, the app reads the latest account board and reconciles the changes:

- New sessions are appended by stable ID, so repeated retries cannot duplicate them.
- Skill name, description, parent/move, status, and other changed fields update the matching skill ID. Unrelated changes from other devices remain intact.
- Resource links merge by their own IDs.
- Deleted-session markers prevent deleted practice from being restored by a stale offline copy.
- Different skills added to the same root slot are assigned available slots. If a merged board would exceed six active root skills or create invalid names/relationships, sync pauses and keeps the offline copy; adjust your local skills and retry.
- If the same field changed differently online and on this device, sync pauses. **Keep online edits** or **Use this device’s edits** resolves those conflicting changes while preserving unrelated edits and session additions. A deletion conflict can remove dependent practice when choosing the online deletion, so choose deliberately.

The existing `save_growth_board` RPC still derives the owner from Supabase Auth and checks the expected revision. Sync rereads and retries revision conflicts; it never uploads an old snapshot without reconciling it. No new SQL migration or credential is required.

After Postgres acknowledges the merged board, the offline envelope is removed. If a connection drops just after a successful save, replay checks IDs and content before writing again. Guest imports still preserve the guest source until an online save is confirmed.

## Account safety

Offline work is scoped to the signed-in account. Multiple tabs coordinate changes and syncing with the same Web Lock. Online account data is kept in memory; changing accounts disposes of that memory. The extension reads the same in-memory/offline board as the app.

Explicit sign-out is blocked while the current account has pending offline edits, with instructions to reconnect and sync first. If the session expires automatically, its pending outbox is retained and can only be opened through the app after signing back into that account. Clean account caches are cleared on sign-out. Pending outboxes are readable through browser developer tools, so do not clear site data or share the browser profile until the queue has synced.

Permission errors do not silently become successful offline edits. If a queued sync requires reauthentication, the notice keeps the queue intact until access is restored. Invalid saved data is also preserved for recovery rather than replaced with an empty board.

## Offline availability limits

This feature supports an already-open board losing its connection. A previously saved offline envelope can be reopened when the app shell and the account's Supabase session are available. There is no service worker or offline HTML/app-shell cache: a fresh page load with no network may be unavailable. First-time sign-in, a new account board, or a device with no offline copy requires a connection. Keep the board open when working offline. An offline envelope is created on disconnect, not proactively during every online load.

If the database is unreachable while the browser still reports internet access, transport failures also queue changes and show a notice. Each database request has a 12-second timeout. Other tabs or devices may continue making changes; genuine conflicts require a choice as described above.

## Verification

Run `npm run test:offline-sync` along with the existing auth, tracker, extension, and security suites.

For a manual check, open Growth Board online and sign in. Disable the network in browser developer tools, wait for the notice, rename/move a skill, and log a session. Confirm those edits remain visible and an account `.offline` key exists. Restore networking, wait for sync, and confirm the session appears exactly once and the offline key disappears. Reload online and verify the database-backed board. Repeat with a second tab and with an independent edit on another device.
