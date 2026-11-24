/* eslint-disable @typescript-eslint/no-require-imports */
// Exercise the actual TypeScript model and storage with an isolated browser store.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const crypto = require("node:crypto");
function load(file, dependencies = {}, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(
    source,
    {
      exports,
      require: (name) => dependencies[name] ?? (name === "./account-cache" ? accountCache : require(name)),
      Date,
      Set,
      Map,
      JSON,
      Error,
      DOMException,
      Number,
      String,
      Intl,
      URL,
      crypto,
      ...globals,
    },
    { filename: file },
  );
  return exports;
}
const accountCache = load("app/auth/account-cache.ts");
const timerPlan = load("extension/growth-focus/timer-plan.mjs");
const model = load("app/growth-board/model.ts", { "../../extension/growth-focus/timer-plan.mjs": timerPlan });
function browserStore() {
  const values = new Map();
  let clock = new Date("2026-11-14T15:00:00Z").getTime();
  class Clock extends Date {
    constructor(...args) {
      super(...(args.length ? args : [clock]));
    }
    static now() {
      return clock;
    }
  }
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const store = load(
    "app/growth-board/storage.ts",
    { "./model": model, react: {} },
    {
      localStorage,
      window: new EventTarget(),
      Event,
      navigator: { locks: { request: async (_key, fn) => fn() } },
      Date: Clock,
    },
  );
  return {
    store,
    values,
    localStorage,
    advance: (ms) => (clock += ms),
    read: () => JSON.parse(values.get(store.STORAGE_KEY)),
  };
}
test("account and guest boards stay separate", async () => {
  const b = browserStore();
  await b.store.addSkill("Guest piano");
  b.store.configureTracker("alice", { save: async () => {} });
  await b.store.addSkill("Alice guitar");
  b.store.configureTracker("bob", { save: async () => {} });
  await b.store.addSkill("Bob drums");
  assert.equal(b.read().skills[0].name, "Bob drums");
  b.store.configureTracker("alice", { save: async () => {} });
  assert.equal(b.read().skills[0].name, "Alice guitar");
  b.store.configureTracker(null);
  assert.equal(b.read().skills[0].name, "Guest piano");
});

test("failed cloud saves and loading boards cannot commit local changes", async () => {
  const b = browserStore();
  b.store.configureTracker("alice", { save: async () => { throw new Error("Database unavailable"); } });
  await assert.rejects(b.store.addSkill("Piano"), /Database unavailable/);
  assert.equal(b.localStorage.getItem(b.store.STORAGE_KEY), null);
  b.store.configureTracker("alice", null, true);
  await assert.rejects(b.store.addSkill("Piano"), /loading/);
  assert.equal(b.localStorage.getItem(b.store.STORAGE_KEY), null);
});

test("switching accounts during a cloud save cannot write into the next account", async () => {
  const b = browserStore();
  let complete;
  b.store.configureTracker("alice", { save: () => new Promise(resolve => { complete = resolve; }) });
  const pending = b.store.addSkill("Private skill");
  b.store.configureTracker("bob", { save: async () => {} });
  complete();
  await assert.rejects(pending, /account changed/);
  assert.equal(b.localStorage.getItem(b.store.STORAGE_KEY), null);
  b.store.configureTracker(null);
  assert.equal(b.localStorage.getItem(b.store.STORAGE_KEY), null);
});

test("guest import is explicit and cannot overwrite an account board", async () => {
  const b = browserStore();
  await b.store.addSkill("Guest piano");
  let saves = 0;
  b.store.configureTracker("alice", { save: async () => { saves++; } });
  assert.equal(b.localStorage.getItem(b.store.STORAGE_KEY), null);
  await b.store.importGuestTracker();
  assert.equal(b.read().skills[0].name, "Guest piano");
  assert.equal(saves, 1);
  await assert.rejects(b.store.importGuestTracker(), /empty account board/);
  b.store.configureTracker(null);
  assert.equal(b.read().skills[0].name, "Guest piano");
});

test('greeting uses account names with safe username and guest fallbacks', () => {
  const { displayName } = load('app/auth/AuthProvider.tsx', { '../lib/supabase': {} });
  assert.equal(displayName({ user_metadata: { display_name: '  Mohit  ' }, email: 'other@example.com' }), 'Mohit');
  assert.equal(displayName({ user_metadata: { full_name: 'Google User' } }), 'Google User');
  assert.equal(displayName({ user_metadata: {}, email: 'mohit@example.com' }), 'mohit');
  assert.equal(displayName(null), 'learner');
});

const { loadAccountBoard } = load('app/growth-board/account-board.ts', { './model': model });
function guestStorage(raw) {
  let value = raw;
  return {
    getItem: () => value,
    removeItem: () => { value = null; },
    set: next => { value = next; },
  };
}

test('first account load transfers the complete guest board exactly once', async () => {
  const b = browserStore();
  const skill = await b.store.addSkill('Piano');
  await b.store.logSession(skill.id, 25, '2026-11-14', 'Practised scales');
  await b.store.startTimer(skill.id, 15, 'Next practice');
  const guest = b.read();
  const storage = guestStorage(JSON.stringify(guest));
  let saved = null;
  let writes = 0;
  const database = {
    read: async () => ({ data: saved, error: null }),
    create: async state => {
      writes++;
      saved = { board: state, revision: 1 };
      return { data: 1, error: null };
    },
  };
  const loaded = await loadAccountBoard(database, storage);
  assert.equal(JSON.stringify(loaded.state), JSON.stringify(guest));
  assert.equal(loaded.revision, 1);
  assert.equal(storage.getItem(), null);
  await loadAccountBoard(database, storage);
  assert.equal(writes, 1);
});

test('existing account boards are never replaced by guest progress', async () => {
  const b = browserStore();
  await b.store.addSkill('Guest piano');
  const raw = JSON.stringify(b.read());
  const storage = guestStorage(raw);
  const loaded = await loadAccountBoard({
    read: async () => ({ data: { board: model.EMPTY_STATE, revision: 4 }, error: null }),
    create: async () => { assert.fail('must not overwrite an existing account'); },
  }, storage);
  assert.equal(loaded.state.skills.length, 0);
  assert.equal(loaded.revision, 4);
  assert.equal(storage.getItem(), raw);
});

test('failed migration preserves guest progress and retries successfully', async () => {
  const raw = JSON.stringify(model.EMPTY_STATE);
  const storage = guestStorage(raw);
  let offline = true;
  const database = {
    read: async () => ({ data: null, error: null }),
    create: async () => offline
      ? { data: null, error: { message: 'Offline' } }
      : { data: 1, error: null },
  };
  await assert.rejects(loadAccountBoard(database, storage), /Offline/);
  assert.equal(storage.getItem(), raw);
  offline = false;
  assert.equal((await loadAccountBoard(database, storage)).revision, 1);
  assert.equal(storage.getItem(), null);
});

test('simultaneous account initialization reloads the winning board without overwriting it', async () => {
  const storage = guestStorage(JSON.stringify(model.EMPTY_STATE));
  let reads = 0;
  const loaded = await loadAccountBoard({
    read: async () => ({ data: ++reads === 1 ? null : { board: model.EMPTY_STATE, revision: 2 }, error: null }),
    create: async () => ({ data: null, error: { code: '40001', message: 'Conflict' } }),
  }, storage);
  assert.equal(loaded.revision, 2);
  assert.equal(reads, 2);
  assert.notEqual(storage.getItem(), null);
});

test('migration retains guest edits made in another tab before the save completes', async () => {
  const raw = JSON.stringify(model.EMPTY_STATE);
  const storage = guestStorage(raw);
  const newer = JSON.stringify({ ...model.EMPTY_STATE, reminderDismissedAt: 123 });
  await loadAccountBoard({
    read: async () => ({ data: null, error: null }),
    create: async () => { storage.set(newer); return { data: 1, error: null }; },
  }, storage);
  assert.equal(storage.getItem(), newer);
});

test('invalid guest data and unconfirmed database saves never discard the source', async () => {
  const invalid = guestStorage('broken json');
  await assert.rejects(loadAccountBoard({
    read: async () => ({ data: null, error: null }),
    create: async () => { assert.fail('must validate before uploading'); },
  }, invalid));
  assert.equal(invalid.getItem(), 'broken json');
  const raw = JSON.stringify(model.EMPTY_STATE);
  const storage = guestStorage(raw);
  await assert.rejects(loadAccountBoard({
    read: async () => ({ data: null, error: null }),
    create: async () => ({ data: null, error: null }),
  }, storage), /did not confirm/);
  assert.equal(storage.getItem(), raw);
});

test('account menu uses only the first name on every screen size', () => {
  const { firstName } = load('app/auth/AuthProvider.tsx', { '../lib/supabase': {} });
  assert.equal(firstName({ user_metadata: { display_name: '  Mohit  yadav  ' } }), 'Mohit');
  assert.equal(firstName({ user_metadata: { full_name: 'Google User' } }), 'Google');
  assert.equal(firstName({ user_metadata: {}, email: 'mohit@example.com' }), 'mohit');
});

test('the account menu supports mobile sign-out taps and keyboard focus dismissal', async () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { firstName } = load('app/auth/AuthProvider.tsx', { '../lib/supabase': {} });
  const state = [];
  let cursor = 0;
  let signOutCalls = 0;
  const AccountButtons = load('app/auth/AccountButtons.tsx', {
    react: {
      ...React,
      useState: initial => {
        const key = cursor++;
        if (!(key in state)) state[key] = initial;
        return [state[key], next => { state[key] = typeof next === 'function' ? next(state[key]) : next; }];
      },
      useEffect: () => {},
      useRef: () => ({ current: null }),
      useId: () => 'account-menu',
    },
    './AuthProvider': {
      useAuth: () => ({ user: { id: 'alice', user_metadata: { display_name: 'Mohit Yadav' } }, ready: true }),
      firstName,
      signOut: async () => { signOutCalls++; },
    },
    '../ui/components/AuthDialog': { default: () => null },
  }).default;
  const render = () => { cursor = 0; return AccountButtons({ growth: true, compactMobile: true }); };
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return null;
    if (predicate(node)) return node;
    for (const child of React.Children.toArray(node.props?.children)) {
      const found = find(child, predicate);
      if (found) return found;
    }
    return null;
  }
  let tree = render();
  const trigger = find(tree, node => node.props?.['aria-haspopup'] === 'menu');
  assert.ok(trigger);
  assert.equal(trigger.props['aria-expanded'], false);
  const closed = renderToStaticMarkup(tree);
  assert.ok(closed.includes('Mohit'));
  assert.ok(!closed.includes('Yadav'));
  assert.ok(!closed.includes('Sign out'));
  trigger.props.onClick();
  tree = render();
  assert.ok(find(tree, node => node.props?.role === 'menu'));
  assert.ok(renderToStaticMarkup(tree).includes('Sign out'));

  // Touch browsers can blur the focused item to the page before dispatching click.
  const inside = {};
  const currentTarget = { contains: target => target === inside };
  tree.props.onBlur({ currentTarget, relatedTarget: null });
  tree = render();
  const signOutItem = find(tree, node => node.props?.role === 'menuitem');
  assert.ok(signOutItem, 'a mobile blur must leave the sign-out target mounted until click');
  await signOutItem.props.onClick();
  assert.equal(signOutCalls, 1);
  assert.equal(find(render(), node => node.props?.role === 'menu'), null);

  find(render(), node => node.props?.['aria-haspopup'] === 'menu').props.onClick();
  tree = render();
  tree.props.onBlur({ currentTarget, relatedTarget: inside });
  assert.ok(find(render(), node => node.props?.role === 'menu'));
  tree.props.onBlur({ currentTarget, relatedTarget: {} });
  assert.equal(find(render(), node => node.props?.role === 'menu'), null);

  find(render(), node => node.props?.['aria-haspopup'] === 'menu').props.onClick();
  tree = render();
  find(tree, node => node.props?.['aria-haspopup'] === 'menu').props.onClick();
  assert.equal(find(render(), node => node.props?.role === 'menu'), null);
});


test('sign-out clears all account boards while preserving guest data and preferences', () => {
  const values = new Map([
    ['progress.skills-tracker.v1.user.alice', 'private Alice board'],
    ['progress.skills-tracker.v1.user.bob', 'private Bob board'],
    ['progress.skills-tracker.v1', 'guest board'],
    ['progress.skills-tracker.theme', 'dark'],
  ]);
  accountCache.clearAccountCaches({
    get length() { return values.size; },
    key: index => [...values.keys()][index] ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  });
  assert.equal(values.has('progress.skills-tracker.v1.user.alice'), false);
  assert.equal(values.has('progress.skills-tracker.v1.user.bob'), false);
  assert.equal(values.get('progress.skills-tracker.v1'), 'guest board');
  assert.equal(values.get('progress.skills-tracker.theme'), 'dark');
  assert.ok(values.get(accountCache.ACCOUNT_CACHE_EPOCH));
});

test('a sign-out in another tab prevents an in-flight save from restoring private cache data', async () => {
  const b = browserStore();
  let complete;
  b.store.configureTracker('alice', { save: () => new Promise(resolve => { complete = resolve; }) });
  const pending = b.store.addSkill('Private skill');
  b.localStorage.setItem(accountCache.ACCOUNT_CACHE_EPOCH, 'signed-out-in-another-tab');
  complete();
  await assert.rejects(pending, /signed out/);
  assert.equal(b.localStorage.getItem(b.store.STORAGE_KEY), null);
});
