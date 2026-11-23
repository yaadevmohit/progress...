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
      require: (name) => dependencies[name] ?? require(name),
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
