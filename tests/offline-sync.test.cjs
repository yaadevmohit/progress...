/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
function load(path, dependencies = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    fileName: path.endsWith(".tsx") ? "source.tsx" : "source.ts", compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => dependencies[name] ?? require(name), Error, TypeError, JSON, Set, Map, Date, URL, crypto, ...globals });
  return exports;
}
const timerPlan = load('extension/growth-focus/timer-plan.mjs');
const model = load('app/growth-board/model.ts', { '../../extension/growth-focus/timer-plan.mjs': timerPlan });
const merge = load('app/growth-board/offline-merge.ts', { './model': model });
const syncModule = load('app/growth-board/offline-sync.ts', { './model': model, './offline-merge': merge });
const cache = load('app/auth/account-cache.ts');
const clone = value => JSON.parse(JSON.stringify(value));
const skill = (id, slot) => ({ id, name: id, slot, color: model.COLORS[slot], parentId: null, status: 'active', description: '', resources: [], createdAt: '2026-11-20T12:00:00Z' });
const session = (id, skillId = 'a') => ({ id, skillId, durationSeconds: 1500, activityDate: '2026-11-20', notes: '', source: 'recorded', createdAt: '2026-11-20T12:00:00Z', timeZone: 'UTC' });
function board() { return model.decodeTracker(JSON.stringify({ ...model.EMPTY_STATE, skills: [skill('a', 0), skill('b', 1)] })).state; }
function storage() {
  const values = new Map();
  return { values, get length() { return values.size; }, key: i => [...values.keys()][i] ?? null,
    getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
function setup(initial = board(), sharedStorage = storage()) {
  let online = true, active = true, status, writeError, readError;
  const db = { state: clone(initial), revision: 1, writes: 0 };
  const api = {
    read: async () => { if (readError) throw readError; return { state: clone(db.state), revision: db.revision }; },
    write: async (state, revision) => {
      if (writeError) throw writeError;
      if (revision !== db.revision) throw new syncModule.DatabaseFailure('stale', '40001');
      db.state = clone(state); db.writes++; return ++db.revision;
    },
  };
  const make = (id = 'alice') => new syncModule.AccountSync(id, api, sharedStorage, () => online, () => active, value => { status = value; });
  const controller = make();
  return { controller, make, db, api, storage: sharedStorage,
    open: () => controller.open(api.read), online: value => { online = value; }, active: value => { active = value; },
    writeError: value => { writeError = value; }, readError: value => { readError = value; }, status: () => status };
}
test('online account boards remain in memory and do not create local board caches', async () => {
  const s = setup(); const original = await s.open();
  const next = clone(original); next.sessions.push(session('new'));
  await s.controller.save(next, original);
  assert.equal(s.db.state.sessions.length, 1);
  assert.equal(s.storage.length, 0);
});
test('offline session additions, skill moves and renames merge with unrelated online edits', async () => {
  const s = setup(); const original = await s.open();
  s.online(false); s.controller.checkpoint();
  const next = clone(original);
  next.skills[0].name = 'Piano'; next.skills[0].parentId = 'b'; next.skills[0].slot = 2;
  next.sessions.push(session('offline'));
  await s.controller.save(next, original);
  assert.equal(s.db.writes, 0);
  assert.equal(s.status().mode, 'offline');
  assert.equal(cache.hasPendingAccountChanges(s.storage, 'alice'), true);
  s.db.state.skills[0].description = 'Edited on my laptop';
  s.db.state.sessions.push(session('online')); s.db.revision++;
  s.online(true); const merged = await s.controller.sync();
  assert.equal(merged.skills[0].name, 'Piano');
  assert.equal(merged.skills[0].parentId, 'b');
  assert.equal(merged.skills[0].description, 'Edited on my laptop');
  assert.deepEqual(new Set(merged.sessions.map(v => v.id)), new Set(['offline', 'online']));
  assert.equal(s.storage.length, 0);
  await s.controller.sync();
  assert.equal(s.db.state.sessions.length, 2);
});
test('offline work survives a controller reload and stays scoped to its account', async () => {
  const s = setup(); const original = await s.open(); s.online(false);
  const next = clone(original); next.sessions.push(session('saved-offline'));
  await s.controller.save(next, original);
  const reopened = await s.make().open(async () => { assert.fail('no network bootstrap offline'); });
  assert.equal(reopened.sessions[0].id, 'saved-offline');
  await assert.rejects(s.make('bob').open(s.api.read), /No offline copy/);
});
test('a failed response after a successful database save cannot duplicate the queued session', async () => {
  const s = setup(); const original = await s.open();
  const next = clone(original); next.sessions.push(session('idempotent'));
  s.writeError(new TypeError('Failed to fetch'));
  await s.controller.save(next, original);
  // Simulate the write reaching Postgres before the connection dropped.
  s.db.state = clone(next); s.db.revision++;
  s.writeError(null); await s.controller.sync();
  assert.equal(s.db.state.sessions.length, 1);
  assert.equal(s.storage.length, 0);
});
test('same-field conflicts require a choice and keep appended sessions regardless of the choice', async () => {
  for (const choice of ['device', 'server']) {
    const s = setup(); const original = await s.open(); s.online(false);
    const next = clone(original); next.skills[0].name = 'Device name'; next.sessions.push(session('new'));
    await s.controller.save(next, original);
    s.db.state.skills[0].name = 'Online name'; s.db.revision++; s.online(true);
    await s.controller.sync();
    assert.equal(s.status().mode, 'conflict'); assert.equal(s.db.writes, 0);
    assert.equal(cache.hasPendingAccountChanges(s.storage), true);
    const merged = await s.controller.sync(choice);
    assert.equal(merged.skills[0].name, choice === 'device' ? 'Device name' : 'Online name');
    assert.equal(merged.sessions.length, 1); assert.equal(s.storage.length, 0);
  }
});
test('network and authentication failures retain the queue but do not confuse permission errors with offline success', async () => {
  const s = setup(); const original = await s.open();
  const next = clone(original); next.skills[0].name = 'New name';
  s.writeError(new syncModule.DatabaseFailure('permission denied', '42501'));
  await assert.rejects(s.controller.save(next, original), /permission denied/);
  assert.equal(s.storage.length, 0);
  s.writeError(new TypeError('Network request failed'));
  await s.controller.save(next, original); assert.equal(s.status().mode, 'offline');
  s.readError(new syncModule.DatabaseFailure('Sign in again', '401'));
  await s.controller.sync(); assert.equal(s.status().mode, 'pending');
  assert.equal(cache.hasPendingAccountChanges(s.storage), true);
});
test('session deletion tombstones prevent stale offline sessions from being resurrected', () => {
  const base = board(); base.sessions.push(session('deleted'));
  const local = clone(base); local.sessions.push(session('added'));
  const remote = clone(base); remote.sessions = []; remote.deletedSessionIds = ['deleted'];
  const result = merge.mergeBoards(base, local, remote);
  assert.deepEqual(result.state.sessions.map(s => s.id), ['added']);
});
test('a second tab applies its own edit to the newest shared offline queue', async () => {
  const s = setup(); const initial = await s.open(); const other = s.make(); await other.open(s.api.read);
  s.online(false);
  const first = clone(initial); first.skills[0].name = 'Renamed';
  await s.controller.save(first, initial);
  const second = clone(initial); second.sessions.push(session('second-tab'));
  const result = await other.save(second, initial);
  assert.equal(result.skills[0].name, 'Renamed'); assert.equal(result.sessions.length, 1);
});
test('automatic session expiration preserves pending work, and the wrong account cannot flush it', async () => {
  const s = setup(); const original = await s.open(); s.online(false);
  const next = clone(original); next.sessions.push(session('pending')); await s.controller.save(next, original);
  cache.clearAccountCaches(s.storage);
  assert.equal(cache.hasPendingAccountChanges(s.storage, 'alice'), true);
  assert.equal(cache.hasPendingAccountChanges(s.storage, 'bob'), false);
  await assert.rejects(s.controller.sync(), /account changed/);
  s.online(true); const restored = await s.make().open(s.api.read);
  assert.equal(restored.sessions.length, 1);
});
test('memory-only tracker reads work for the extension and exports without persisting an online board', async () => {
  const localStorage = storage(); const window = new EventTarget();
  const store = load('app/growth-board/storage.ts', { './model': model, react: {} }, {
    localStorage, window, Event, navigator: { locks: { request: async (_key, work) => work() } },
  });
  store.configureTracker('alice', { memoryOnly: true, save: async state => state });
  store.replaceTracker(board());
  await store.logSession('a', 20, '2026-11-20', 'In memory');
  assert.equal(JSON.parse(store.readTrackerRaw()).sessions.length, 1);
  assert.equal(localStorage.getItem(store.STORAGE_KEY), null);
  store.configureTracker(null);
  assert.equal(JSON.parse(store.readTrackerRaw()).skills.length, 0);
});

test('concurrent new skills retain their IDs and receive distinct active root slots', () => {
  const base = board(), local = clone(base), remote = clone(base);
  local.skills.push(skill('local-new', 2)); remote.skills.push(skill('remote-new', 2));
  const merged = merge.mergeBoards(base, local, remote);
  assert.equal(merged.conflicts.length, 0);
  assert.equal(merged.state.skills.length, 4);
  assert.equal(new Set(merged.state.skills.map(s => s.slot)).size, 4);
});
test('full browser storage rejects offline edits without modifying the accepted working board', async () => {
  const s = setup(); const original = await s.open(); s.online(false);
  s.storage.setItem = () => { throw new Error('Quota exceeded'); };
  const next = clone(original); next.sessions.push(session('unsaved'));
  await assert.rejects(s.controller.save(next, original), /Quota exceeded/);
  assert.equal(s.db.state.sessions.length, 0);
  assert.equal(s.status().mode, 'pending');
  assert.ok(s.status().message.includes('not saved'));
});
test('explicit sign-out blocks the current pending account but allows another account to sign out', async () => {
  const s = setup(); const original = await s.open(); s.online(false);
  const next = clone(original); next.sessions.push(session('pending'));
  await s.controller.save(next, original);
  let calls = 0;
  const auth = load('app/auth/AuthProvider.tsx', {
    './account-cache': cache,
    '../lib/supabase': { requireSupabase: () => ({ auth: { signOut: async () => { calls++; return { error: null }; } } }) },
  }, { localStorage: s.storage });
  await assert.rejects(auth.signOut('alice'), /sync your offline changes/);
  assert.equal(calls, 0);
  await auth.signOut('bob'); assert.equal(calls, 1);
});
test('offline and conflicting-edit notices render clear retry and resolution controls', () => {
  const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
  let context = { signedIn: true, saving: false, canImport: false, status: { mode: 'offline', pending: true, message: 'No internet connection. Changes are saved on this device.' }, refresh: async () => {} };
  const Status = load('app/growth-board/BoardDataProvider.tsx', {
    react: { ...React, useContext: () => context }, './model': model,
    '../auth/AuthProvider': {}, '../auth/AccountButtons': {}, '../lib/supabase': {},
    './account-board': {}, './offline-sync': syncModule, './storage': {}, './BoardSkeleton': {},
  }).BoardSyncStatus;
  const html = renderToStaticMarkup(React.createElement(Status));
  assert.ok(html.includes('No internet connection')); assert.ok(html.includes('Retry sync'));
  context = { ...context, status: { mode: 'conflict', pending: true, message: 'Conflicting changes' } };
  const conflict = renderToStaticMarkup(React.createElement(Status));
  assert.ok(conflict.includes('Keep online edits')); assert.ok(conflict.includes('Use this device'));
  context = { ...context, status: { mode: 'online', pending: false, message: '' } };
  assert.equal(renderToStaticMarkup(React.createElement(Status)), '');
});

test('an idle tab checkpoint cannot hide a newer acknowledged session on the active tab', async () => {
  const s = setup(); const original = await s.open(); const idle = s.make(); await idle.open(s.api.read);
  const next = clone(original); next.sessions.push(session('recent-online'));
  await s.controller.save(next, original);
  s.online(false); idle.checkpoint();
  const checkpoint = s.controller.checkpoint();
  assert.equal(checkpoint.sessions.length, 1);
  assert.equal(checkpoint.sessions[0].id, 'recent-online');
  s.online(true); await s.controller.sync();
  assert.equal(s.db.state.sessions.length, 1);
});
