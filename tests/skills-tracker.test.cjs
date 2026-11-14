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
      URL,
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

test("resources are optional in older saves and multiple links persist independently", async () => {
  const b = browserStore();
  const skill = await b.store.addSkill("Spanish");
  assert.equal(model.decodeTracker(JSON.stringify(b.read())).error, null);
  const first = await b.store.addResource(
    skill.id,
    "  Course  ",
    "https://example.com/course",
  );
  await b.store.addResource(
    skill.id,
    "Dictionary",
    "https://example.com/dictionary",
  );
  assert.equal(b.read().skills[0].resources.length, 2);
  assert.equal(b.read().skills[0].resources[0].name, "Course");
  await assert.rejects(
    b.store.addResource(skill.id, "Duplicate", first.url),
    /already saved/,
  );
  await b.store.removeResource(skill.id, first.id);
  assert.equal(b.read().skills[0].resources.length, 1);
  assert.equal(b.read().skills[0].resources[0].name, "Dictionary");
  assert.equal(b.read().sessions.length, 0);
});

test("resources reject unsafe links and malformed saved resources without losing data", async () => {
  const b = browserStore(),
    skill = await b.store.addSkill("Python");
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,hello",
    "file:///tmp/file",
    "not a link",
    "https://user:password@example.com",
  ]) {
    await assert.rejects(
      b.store.addResource(skill.id, "Guide", url),
      /valid http or https/,
    );
  }
  assert.equal(b.read().skills[0].resources, undefined);
  const valid = await b.store.addResource(
    skill.id,
    "Guide",
    "https://example.com",
  );
  const state = b.read();
  state.skills[0].resources[0].url = "javascript:alert(1)";
  assert.ok(model.decodeTracker(JSON.stringify(state)).error);
  state.skills[0].resources = [valid, valid];
  assert.ok(model.decodeTracker(JSON.stringify(state)).error);
});

test("only one add card follows existing skills until all six slots are filled", () => {
  assert.equal(JSON.stringify(model.visibleSkillSlots([])), "[0]");
  const skills = [skill("a", 3), skill("b", 0)];
  assert.equal(JSON.stringify(model.visibleSkillSlots(skills)), "[3,0,1]");
  for (const slot of [1, 2, 4]) skills.push(skill(String(slot), slot));
  assert.equal(model.visibleSkillSlots(skills).length, 6);
  skills.push(skill("last", 5));
  assert.equal(model.visibleSkillSlots(skills).length, 6);
  assert.equal(new Set(model.visibleSkillSlots(skills)).size, 6);
});

test("donut segments represent actual time, exclude unpractised skills and cover the whole ring", () => {
  const skills = [
    { ...skill("a", 0), seconds: 1500 },
    { ...skill("b", 1), seconds: 4500 },
    { ...skill("c", 2), seconds: 0 },
  ];
  let segments = model.practiceBreakdown(skills);
  assert.equal(segments.length, 2);
  assert.equal(segments[0].percent, 25);
  assert.equal(segments[1].percent, 75);
  assert.equal(segments[1].offset, 25);
  assert.notEqual(segments[0].color, segments[1].color);
  skills[2].seconds = 6000;
  segments = model.practiceBreakdown(skills);
  assert.equal(segments.length, 3);
  assert.equal(segments[2].percent, 50);
  assert.equal(
    segments.reduce((sum, segment) => sum + segment.percent, 0),
    100,
  );
  assert.equal(
    model.practiceBreakdown([{ ...skill("zero", 0), seconds: 0 }]).length,
    0,
  );
});
