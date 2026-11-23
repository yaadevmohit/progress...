# Mock Growth Board learners

The seed creates 1,000 real Supabase Auth email/password accounts and one learning board for each. Every learner has a unique synthetic display name, an email from `growth.mock.0001@example.com` through `growth.mock.1000@example.com`, and a unique random password. Emails are auto-confirmed using the admin API; no confirmation messages or invitations are sent. Passwords are managed by Supabase Auth, never stored in board JSON.

Histories cover 1–24 calendar months, distributed across all 24 durations, ending on the seed date in America/Toronto. Each board has 2–4 skills and roughly 1–3 sessions per week, with 15–60 minute sessions and both history endpoints included. Auth accounts are created now; only learning events and skill creation dates are historical.

## Run

Use Node 22+ and run the existing `supabase/migrations/202611230001_growth_board.sql` migration first. Preview locally without changing Supabase:

```sh
npm run seed:mock-users
```

Add `SUPABASE_SECRET_KEY=...` (or the legacy `SUPABASE_SERVICE_ROLE_KEY`) to the ignored `.env.local`, alongside the existing project URL. Obtain the admin key from your Supabase project settings. This is a local administrative script, not an app runtime requirement; never prefix the admin key with `NEXT_PUBLIC_`, commit it, or add it to browser code.

```sh
npm run seed:mock-users -- --apply
```

The script saves passwords to `.mock-users/accounts.json` with owner-only permissions before creating accounts. This directory is ignored by Git. Keep the file to retrieve test logins and resume interrupted runs. Do not publish it. Sign in through the application's normal email/password dialog using any account from that file.

Re-running uses the same emails, passwords and seed date. Existing boards are preserved, including any edits made during testing. Non-seed email collisions stop the script. Requests run sequentially, progress is printed every 50 users, and each board's existence is checked after insertion. On request failures the script stops; re-run to resume. There is no bulk deletion or overwrite operation.

## Free-tier footprint

Supabase currently includes a **500 MB Postgres database**, **1 GB file storage**, and **50,000 monthly active users** on Free ([pricing](https://supabase.com/pricing), checked November 23, 2026). Accounts and board JSON consume database space, not file storage. This seed uploads no files and does not sign users in automatically.

The preview reports exact uncompressed board JSON bytes and session count for the chosen date. The generator refuses payloads above 32 MiB total or 512 KiB per board. Postgres JSONB representation, compression, Auth records, indexes and system tables affect actual disk usage; payload size is not a measurement of total database usage. Check **Supabase Dashboard → project usage** for available headroom before applying. No script using only the Data/Auth API can guarantee the whole project remains under quota.

For exact database and table usage, run this read-only query in the SQL Editor before and after seeding:

```sql
select pg_size_pretty(pg_database_size(current_database())) as database_size,
       pg_size_pretty(pg_total_relation_size('public.growth_boards')) as boards_size,
       pg_size_pretty(pg_total_relation_size('auth.users')) as auth_users_size,
       pg_size_pretty(pg_total_relation_size('auth.identities')) as identities_size;
```
