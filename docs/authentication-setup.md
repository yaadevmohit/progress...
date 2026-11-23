# Growth Board accounts and database setup

Growth Board uses Supabase Auth (email/password and Google) and Supabase Postgres. There is no custom password database. The main progress app and Growth Board share the same account session and sign-in dialog. Only Growth Board data is stored in the new database; the older progress dashboard remains its existing implementation.

## 1. Create the database

Create a Supabase project. Open **SQL Editor** and run the entire file:

`supabase/migrations/202611230001_growth_board.sql`

Run this migration, not the older design-only `docs/skills-tracker-schema.sql`. The live table is `public.growth_boards`: one versioned JSON board per authenticated user, containing skills, resources, sessions, retained practice credits, reminders, and the active timer. Names are stored in Supabase Auth user metadata (`display_name` for email accounts; Google supplies `full_name`).

Row-level security allows users to read only their own board. Writes use `save_growth_board`, which validates the authenticated owner and expected revision before saving atomically. Anonymous visitors have no access. Deleting a user from Supabase Auth deletes their board.

## 2. Put app credentials in `.env.local`

Use Node.js 22 or newer (Node 24 is specified in `.nvmrc`). In the repository root, copy `.env.example` to `.env.local` and fill in:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

Find these in your Supabase project's **Connect** dialog or **Settings → API / API Keys**. Use the project URL and **publishable** key (the legacy `anon` key also works). These public values identify the project; user access is enforced by Auth and RLS.

**Do not put the database password, connection URI, secret key, service-role key, Google client secret, or account passwords in `NEXT_PUBLIC_*` variables.** This application needs none of those secrets in its source or hosting environment. `.env.local` is ignored by Git. Do not send credentials in chat.

Restart `npm run dev` after changing environment variables. On your hosting provider (for example Vercel), add the same two environment variables to the intended environments and redeploy. Next.js embeds public environment values during the build.

## 3. Configure email sign-in

In Supabase **Authentication → Providers / Sign In → Email**, enable email/password and keep email confirmation enabled.

In **Authentication → URL Configuration**:

- Set **Site URL** to your deployed app origin, for example `https://your-app.example` (use `http://localhost:3000` while developing locally).
- Add `http://localhost:3000/growth-board` to **Redirect URLs**.
- Add `https://your-app.example/growth-board` for production. Add exact preview addresses if you need preview deployments.

Sign-up stores the entered name in the Auth user record. If email confirmation is enabled, the dialog asks the user to check email; confirming the link restores the session and opens Growth Board. PKCE confirmation links should be opened in the same browser/device that initiated registration. Otherwise, confirm and then sign in manually on the original browser. Set up custom SMTP in Supabase for production email delivery and review your project's email rate limits.

## 4. Configure Google sign-in

1. In Google Cloud Console, configure an OAuth consent screen and create a **Web application** OAuth client. Add test users while the consent screen is in testing mode.
2. Use the exact callback URL shown by Supabase's Google provider as an **Authorized redirect URI** in Google (usually `https://YOUR_PROJECT.supabase.co/auth/v1/callback`).
3. Put the **Google Client ID and Client Secret in Supabase → Authentication → Providers / Sign In → Google**. Enable the provider and save. These credentials belong in Supabase, not `.env.local` or GitHub.
4. The app's post-login `/growth-board` URLs must also appear in Supabase's Redirect URLs from step 3.

## Account and browser behavior

- Guests keep using the existing browser-only board without an account.
- When an account gets its first database board, the app automatically transfers the current guest board (skills, resources, sessions, reminders, and active timer). This runs after authentication, including email confirmation and Google sign-up. The guest copy is removed only after the database confirms the save; newer guest edits from another tab are kept. A failed migration leaves local progress intact and offers a retry. Existing database boards are never overwritten by this automatic transfer. Empty existing boards can still use **Import into this account** explicitly.
- Each account has a separate browser cache. The header shows a user icon and your first name; click it to open the sign-out menu. Signing out returns to the guest board, which starts empty after a successful transfer. Shared-device users should clear site data when they want to remove locally cached copies; caches are not encrypted.
- Signed-in edits save to the database before the displayed board changes. A network/database failure reports an error and leaves the last saved board intact. There is no offline write queue for accounts.
- The subtle **Refresh board** icon below the active-skill count fetches changes from other devices. A stale tab/device cannot silently overwrite newer work: reload and repeat the edit after a conflict.
- The homepage greeting follows the authenticated name, with an email username fallback. Guests see “Hello, learner”.
- The Growth Focus extension uses the board active in its connected app tab. Signed-in extension timer operations also require a working database connection. The extension does not receive Supabase credentials.
- If credentials are missing, guest mode works and the auth dialog explains that account services need configuration. If the migration is missing or access fails, the account board shows a retryable error instead of loading another user's or guest's data.

## Verify your setup

1. Run `npm run lint`, `npm run test:skills-tracker`, `npm run test:growth-board-auth`, `npm run test:growth-focus`, and `npm run build`.
2. Create an email account, confirm its email, sign in, and check that the greeting uses the entered name.
3. Add a skill and session; reload and verify both remain. Sign in from a second browser and verify the same board loads.
4. Sign out; create a second account and verify it cannot see the first account's board. Check the `growth_boards` table in Supabase.
5. Test Google sign-in after enabling the provider. Test a stale-tab save and a network failure; both should show errors without replacing saved data.

Automated tests cover local persistence, account separation, failed saves, switching accounts during an in-flight save, explicit guest imports, automatic first-board migration, failed migration retries, initialization conflicts, and concurrent guest edits. Live email, Google redirects, and deployed RLS require a configured Supabase project and must be checked after setup.

References: [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys), [email sign-up](https://supabase.com/docs/reference/javascript/auth-signup), [OAuth sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithoauth).
