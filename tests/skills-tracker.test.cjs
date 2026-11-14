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
      crypto,
      ...globals,
    },
    { filename: file },
  );
  return exports;
}
const model = load("app/skills-tracker/model.ts");
const session = (day, skillId = "a", seconds = 1500) => ({
  id: crypto.randomUUID(),
  skillId,
  activityDate: day,
  durationSeconds: seconds,
  notes: "",
  source: "recorded",
  createdAt: day + "T12:00:00Z",
  timeZone: "America/Toronto",
});
const skill = (id, slot) => ({
  id,
  name: id,
  slot,
  color: "#059669",
  createdAt: "2026-11-01T12:00:00Z",
});
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
    "app/skills-tracker/storage.ts",
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
test("overall streak deduplicates days across skills and survives until today ends", () => {
  const sessions = [
    session("2026-11-14"),
    session("2026-11-14", "b"),
    session("2026-11-13", "b"),
    session("2026-11-12"),
  ];
  assert.equal(model.currentStreak(sessions, "2026-11-14"), 3);
  assert.equal(model.currentStreak(sessions, "2026-11-15"), 3);
  assert.equal(model.currentStreak(sessions, "2026-11-16"), 0);
  assert.equal(model.shiftDay("2026-03-09", -1), "2026-03-08");
  assert.equal(
    model.currentStreak(
      [session("2025-12-31"), session("2026-01-01")],
      "2026-01-01",
    ),
    2,
  );
});
test("leader requires actual time and changes with total practice", () => {
  const state = {
    ...model.EMPTY_STATE,
    skills: [skill("a", 0), skill("b", 1)],
    sessions: [],
  };
  assert.equal(model.mostPractised(state, "2026-11-14"), null);
  state.sessions = [
    session("2026-11-14", "a", 1500),
    session("2026-11-14", "b", 2700),
  ];
  assert.equal(model.mostPractised(state, "2026-11-14").id, "b");
  state.sessions.push(session("2026-11-14", "a", 1500));
  assert.equal(model.mostPractised(state, "2026-11-14").id, "a");
});
test("weekly windows start at current month when empty and expand to three months", () => {
  const empty = model.weeklyActivity([], "2026-11-14");
  assert.equal(empty.start, "2026-11-01");
  assert.equal(empty.end, "2026-11-30");
  assert.equal(empty.weeks.length, 6);
  assert.ok(empty.weeks.every((w) => w.seconds === 0));
  const active = model.weeklyActivity(
    [session("2026-11-13"), session("2026-11-14"), session("2026-08-30")],
    "2026-11-14",
  );
  assert.equal(active.start, "2026-09-01");
  assert.equal(
    active.weeks.reduce((n, w) => n + w.count, 0),
    2,
  );
  assert.equal(active.weeks.find((w) => w.count).activeDays, 2);
  assert.equal(
    model.weeklyActivity([session("2026-01-01")], "2026-01-14").start,
    "2025-11-01",
  );
});
test("invalid saved data is rejected without silently overwriting it", async () => {
  const b = browserStore();
  b.localStorage.setItem(b.store.STORAGE_KEY, "broken");
  await assert.rejects(b.store.addSkill("Spanish"), /has not been overwritten/);
  assert.equal(b.localStorage.getItem(b.store.STORAGE_KEY), "broken");
  assert.ok(
    model.decodeTracker(
      JSON.stringify({
        ...model.EMPTY_STATE,
        skills: [skill("a", 0), skill("b", 0)],
      }),
    ).error,
  );
  assert.equal(model.validDay("2026-02-30"), false);
});
test("inline slots, duplicate names and six-skill maximum are enforced", async () => {
  const b = browserStore();
  const spanish = await b.store.addSkill(" Spanish ", 3);
  assert.equal(spanish.slot, 3);
  await assert.rejects(b.store.addSkill("SPANISH"), /already/);
  for (const name of ["Guitar", "Cooking", "Python", "Drawing", "Piano"])
    await b.store.addSkill(name);
  assert.equal(b.read().skills.length, 6);
  assert.equal(new Set(b.read().skills.map((s) => s.slot)).size, 6);
  await assert.rejects(b.store.addSkill("Seventh"), /six/);
});
test("logging validates dates and foreign keys, and reports write failures", async () => {
  const b = browserStore(),
    s = await b.store.addSkill("Spanish");
  await assert.rejects(
    b.store.logSession("missing", 25, "2026-11-14", ""),
    /Choose a skill/,
  );
  await assert.rejects(
    b.store.logSession(s.id, 0, "2026-11-14", ""),
    /duration/,
  );
  await assert.rejects(
    b.store.logSession(s.id, 25, "2099-01-01", ""),
    /past date/,
  );
  await b.store.logSession(s.id, 45, "2026-11-13", "Notes");
  assert.equal(b.read().sessions[0].durationSeconds, 2700);
  b.localStorage.setItem = () => {
    throw new DOMException("Quota", "QuotaExceededError");
  };
  await assert.rejects(b.store.addSkill("Guitar"), /Couldn’t save/);
  assert.equal(b.read().skills.length, 1);
});
test("timer completion recovers after time passes and is idempotent", async () => {
  const b = browserStore(),
    s = await b.store.addSkill("Spanish"),
    timer = await b.store.startTimer(s.id, 25, "Focus");
  await assert.rejects(b.store.startTimer(s.id, 25, ""), /current timer/);
  await assert.rejects(b.store.finishTimer(timer.id), /not finished/);
  b.advance(26 * 60000);
  await b.store.finishTimer(timer.id);
  await b.store.finishTimer(timer.id);
  assert.equal(b.read().sessions.length, 1);
  assert.equal(b.read().sessions[0].durationSeconds, 1500);
  assert.equal(b.read().activeTimer, null);
});
test("early finish logs elapsed time, cancellation logs nothing, reminder snoozes 48h", async () => {
  const b = browserStore(),
    s = await b.store.addSkill("Python");
  let timer = await b.store.startTimer(s.id, 25, "");
  await assert.rejects(b.store.finishTimer(timer.id, true), /one minute/);
  b.advance(90 * 1000);
  await b.store.finishTimer(timer.id, true);
  assert.equal(b.read().sessions[0].durationSeconds, 90);
  timer = await b.store.startTimer(s.id, 25, "");
  await b.store.cancelTimer(timer.id);
  assert.equal(b.read().sessions.length, 1);
  await b.store.dismissReminder();
  const dismissed = b.read().reminderDismissedAt;
  b.advance(model.REMINDER_INTERVAL);
  await b.store.dismissReminder();
  assert.equal(b.read().reminderDismissedAt - dismissed, 48 * 60 * 60 * 1000);
});
