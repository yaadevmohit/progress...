# Apply and verify the security fixes

The security patch updates Next.js to 16.4.6, updates PostCSS and compatible transitive packages, clears all account board caches on sign-out, prevents in-flight saves from restoring cleared caches, and adds a nonce-based Content Security Policy (CSP) plus framing, MIME, referrer, and device-permission headers. Guest progress and theme preferences remain on the device.

The completed dependency audit reports zero known vulnerabilities as of November 23, 2026. This is not a guarantee against undiscovered issues; rerun the audit when dependencies change.

## 1. Deploy the code

Merge the Growth Board security change into `main` through a pull request. In Vercel, wait for the resulting **Production** deployment to show **Ready**, then verify your production domain is assigned to it.

Keep these existing Vercel environment variables enabled for Production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

No new secret or environment variable is required for this patch. The policy permits connections only to the configured Supabase project (including its WebSocket origin). If you change the project URL, rebuild and redeploy.

The strict script policy uses a fresh nonce for every page request. Pages now use server rendering and `private, no-store` responses, which can increase Vercel function usage compared with the previous static pages. Inline style attributes remain allowed for chart and theme rendering; inline scripts require a nonce. Local development permits eval and hot-reload connections; production does not.

## 2. Verify Supabase permissions

Open **Supabase → Database → Security Advisor** and review all security findings. In **Table Editor → growth_boards**, verify RLS is enabled. The app's migration is `supabase/migrations/202611230001_growth_board.sql`.

The intended access is:

- `anon`: no access to `growth_boards` and no permission to run `save_growth_board`.
- `authenticated`: can SELECT only rows where `auth.uid() = user_id`; cannot INSERT, UPDATE, or DELETE directly.
- Authenticated writes use `save_growth_board`, whose owner check must match both the requested owner and the verified JWT user. Its fixed `search_path` prevents untrusted schema resolution.

You can inspect the deployed configuration with these read-only SQL Editor queries:

```sql
select relrowsecurity
from pg_class
where oid = 'public.growth_boards'::regclass;

select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'growth_boards';

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'growth_boards'
  and grantee in ('anon', 'authenticated', 'PUBLIC');

select pg_get_functiondef('public.save_growth_board(jsonb,bigint,uuid)'::regprocedure);
```

The SQL Editor runs with administrative privileges: seeing all rows there does not test user isolation. Use two separate test accounts in separate browser profiles. Confirm each sees only its own board, and verify direct API queries for the other account return no rows. Do not use the service-role/secret key for this test, since those bypass RLS. If the deployed permissions differ, review the migration before applying it; do not disable RLS to make sign-in work.

## 3. Review authentication settings

In **Supabase → Authentication**:

1. Under **Sign In / Providers → Email**, keep email confirmation enabled. Review password strength and enable leaked-password protection if available on your plan.
2. Under **Rate Limits**, review the limits for login, sign-up, and email sending. Supabase already rate-limits Auth endpoints; preserve those protections and monitor Auth logs for abuse.
3. Under **URL Configuration**, set Site URL to `https://skills-tracker-six.vercel.app` and include `https://skills-tracker-six.vercel.app/growth-board` as an exact production redirect. Remove unused preview redirects and broad production wildcards.
4. Enable MFA for your own Supabase and Vercel administrator accounts. End-user MFA requires a separate enrollment and verification flow in the app.

Do not enable CAPTCHA in Supabase until the app has a CAPTCHA widget and passes its token to sign-in/sign-up. Turning it on alone will break those forms. CAPTCHA integration is an optional additional abuse control, not a missing part of the fixes in this patch.

References: [password security](https://supabase.com/docs/guides/auth/password-security), [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits), [CAPTCHA integration](https://supabase.com/docs/guides/auth/auth-captcha), [production checklist](https://supabase.com/docs/guides/security/production-checklist).

## 4. Verify the production deployment

Run:

```sh
curl -I https://skills-tracker-six.vercel.app/growth-board
```

Expect `Content-Security-Policy` containing a nonce and `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`. The page should not be served from a shared HTML cache. Loading the page twice should produce different nonce values.

Then verify in the browser:

1. Sign in, add a test skill, reload, and confirm it persists in the database.
2. Sign out. In **Developer Tools → Application → Local Storage**, verify no keys starting with `progress.skills-tracker.v1.user.` remain. Guest and theme keys may remain.
3. Repeat with two tabs open and sign out while an edit is saving. The old account cache must not reappear. A save already accepted by the database can remain in that account; it must not restore the browser cache after sign-out.
4. Confirm both themes, account dialogs, chart selection, extension connection, and email/Google redirects work. Check the browser console for CSP violations. Use exact local/preview redirects in Supabase for any non-production testing origins.

## Ongoing local checks

Use Node 22+ (Node 24 is in `.nvmrc`), then run:

```sh
npm ci
npm audit
npm run lint
npm run test:security
npm run test:growth-board-auth
npm run test:skills-tracker
npm run test:growth-focus
npm run test:mock-users
npm run build -- --webpack
```

Do not use `npm audit fix --force` without reviewing the proposed upgrades. Keep admin credentials server-only, and never commit `.env.local` or local mock-account passwords.
