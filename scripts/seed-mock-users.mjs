import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import { makeBoard, profile, SEED_TAG, seedSummary, USER_COUNT } from './lib/mock-learners.mjs';

try { loadEnvFile('.env.local'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--apply')) throw new Error('Usage: npm run seed:mock-users -- [--apply]');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anchorDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const path = '.mock-users/accounts.json';
let manifest;
try {
  manifest = JSON.parse(await readFile(path, 'utf8'));
  if (manifest.seed !== SEED_TAG || manifest.project !== url || manifest.accounts.length !== USER_COUNT) throw new Error('Existing mock credentials belong to a different seed/project');
  for (let i = 0; i < USER_COUNT; i++) {
    if (manifest.accounts[i].email !== profile(i).email || typeof manifest.accounts[i].password !== 'string' || manifest.accounts[i].password.length < 20) throw new Error('Invalid mock credentials file');
  }
} catch (error) { if (error.code !== 'ENOENT') throw error; }
console.log(JSON.stringify(seedSummary(manifest?.anchorDay ?? anchorDay), null, 2));
if (!args.includes('--apply')) {
  console.log('Preview only. Run with --apply to create accounts and boards. No credentials or remote data written.');
  process.exit(0);
}
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and server-only SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in .env.local. Never use NEXT_PUBLIC_ for the admin key.');
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
function check(error, operation) { if (error) throw new Error(`${operation} failed (${error.code || error.status || 'request error'}). Re-run to resume; existing boards are preserved.`); }
// Preflight schema and admin access before saving credentials or creating users.
const preflight = await client.from('growth_boards').select('user_id').limit(1);
check(preflight.error, 'Board preflight');
const users = new Map();
for (let page = 1; ; page++) {
  const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
  check(error, 'List users');
  for (const user of data.users) users.set(user.email, user);
  if (data.users.length < 1000) break;
}
for (let i = 0; i < USER_COUNT; i++) {
  const existing = users.get(profile(i).email);
  if (existing && (existing.app_metadata?.mock_seed !== SEED_TAG || !manifest)) throw new Error(`Account collision at mock index ${i}; refusing to modify it. Keep the original local credentials file to resume.`);
}
if (!manifest) {
  manifest = { seed: SEED_TAG, project: url, anchorDay, accounts: Array.from({ length: USER_COUNT }, (_, index) => ({ ...profile(index), password: `Gb!9${randomBytes(24).toString('base64url')}` })) };
  await mkdir('.mock-users', { recursive: true, mode: 0o700 });
  await writeFile(path, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
}
await chmod(path, 0o600);
let created = 0, inserted = 0;
for (let i = 0; i < USER_COUNT; i++) {
  const account = manifest.accounts[i];
  let user = users.get(account.email);
  if (!user) {
    const { data, error } = await client.auth.admin.createUser({ email: account.email, password: account.password, email_confirm: true,
      user_metadata: { display_name: account.name }, app_metadata: { mock_seed: SEED_TAG } });
    check(error, `Create mock user ${i + 1}`);
    user = data.user;
    created++;
  }
  const board = makeBoard(i, manifest.anchorDay);
  // DO NOTHING on conflict: reruns must not erase edits made while testing.
  const result = await client.from('growth_boards').upsert({ user_id: user.id, board, revision: 1 }, { onConflict: 'user_id', ignoreDuplicates: true }).select('user_id');
  check(result.error, `Save mock board ${i + 1}`);
  inserted += result.data.length;
  const verified = await client.from('growth_boards').select('user_id').eq('user_id', user.id).single();
  check(verified.error, `Verify mock board ${i + 1}`);
  if ((i + 1) % 50 === 0) console.log(`Verified ${i + 1}/${USER_COUNT} accounts and boards`);
}
console.log(`Complete: ${created} accounts created, ${inserted} boards inserted; ${USER_COUNT} accounts and boards verified. Credentials: ${path} (local only).`);
