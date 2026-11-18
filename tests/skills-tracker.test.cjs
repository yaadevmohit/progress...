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
const model = load("app/growth-board/model.ts");
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

test("activity scales grow with local history, including an annual scale after twelve calendar months", () => {
  assert.equal(
    JSON.stringify(model.activityHistory([], [], "2026-11-14").views),
    '["weeks"]',
  );
  assert.equal(
    JSON.stringify(
      model.activityHistory([], [session("2026-10-31")], "2026-11-14").views,
    ),
    '["weeks","months"]',
  );
  assert.equal(
    JSON.stringify(
      model.activityHistory([], [session("2025-12-31")], "2026-01-01").views,
    ),
    '["weeks","months"]',
  );
  assert.equal(
    JSON.stringify(
      model.activityHistory([], [session("2025-11-14")], "2026-11-14").views,
    ),
    '["weeks","months","years"]',
  );
  const oldSkill = { ...skill("a", 0), createdAt: "2025-10-01T12:00:00Z" };
  assert.equal(
    model.activityHistory([oldSkill], [], "2026-11-14").views.length,
    3,
  );
  assert.equal(
    model.activityHistory([], [session("2099-01-01")], "2026-11-14").views
      .length,
    1,
  );
});

test("monthly and annual activity aggregate real sessions across year boundaries", () => {
  const sessions = [
    session("2025-12-31", "a", 1500),
    session("2026-01-01", "b", 2700),
    session("2026-01-01", "a", 600),
    session("2026-11-14", "a", 900),
  ];
  const monthly = model.activityTimeline([], sessions, "2026-11-14", "months");
  assert.equal(monthly.buckets.length, 12);
  assert.equal(
    monthly.buckets.find((b) => b.start === "2026-01-01").seconds,
    3300,
  );
  assert.equal(
    monthly.buckets.find((b) => b.start === "2026-01-01").activeDays,
    1,
  );
  const annual = model.activityTimeline([], sessions, "2026-11-14", "years");
  assert.equal(annual.buckets.length, 2);
  assert.equal(annual.buckets[0].seconds, 1500);
  assert.equal(annual.buckets[1].seconds, 4200);
  assert.equal(
    annual.buckets.reduce((sum, b) => sum + b.count, 0),
    4,
  );
});

test("activity navigation cannot pass local history or move into future periods", () => {
  const sessions = [session("2026-10-31")];
  const earliest = model.activityTimeline(
    [],
    sessions,
    "2026-11-14",
    "months",
    -100,
  );
  assert.equal(earliest.offset, -1);
  assert.equal(earliest.start, "2026-10-01");
  const future = model.activityTimeline(
    [],
    sessions,
    "2026-11-14",
    "weeks",
    100,
  );
  assert.equal(future.offset, 0);
  assert.equal(future.end, "2026-11-30");
  const empty = model.activityTimeline([], [], "2026-11-14", "weeks", -20);
  assert.equal(empty.minOffset, 0);
  assert.equal(empty.start, "2026-11-01");
});

test("daily streak celebration happens once across reloads and becomes available on a new day", () => {
  const values = new Map();
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const first = load(
    "app/growth-board/daily-streak.ts",
    {},
    { localStorage },
  );
  assert.equal(first.claimDailyStreak("2026-11-17"), true);
  assert.equal(first.claimDailyStreak("2026-11-17"), false);
  const reloaded = load(
    "app/growth-board/daily-streak.ts",
    {},
    { localStorage },
  );
  assert.equal(reloaded.claimDailyStreak("2026-11-17"), false);
  assert.equal(reloaded.claimDailyStreak("2026-11-18"), true);
});

test("daily streak celebration still avoids repeats when storage is blocked", () => {
  const localStorage = {
    getItem: () => {
      throw new Error("blocked");
    },
  };
  const daily = load(
    "app/growth-board/daily-streak.ts",
    {},
    { localStorage },
  );
  assert.equal(daily.claimDailyStreak("2026-11-17"), true);
  assert.equal(daily.claimDailyStreak("2026-11-17"), false);
});

test("latest session comes from any skill and does not change the most practiced skill", () => {
  const a = session("2026-11-16", "a", 3600);
  const b = session("2026-11-17", "b", 600);
  const sessions = [a, b];
  const state = {
    ...model.EMPTY_STATE,
    skills: [skill("a", 0), skill("b", 1)],
    sessions,
  };
  assert.equal(model.mostPractised(state, "2026-11-17").id, "a");
  assert.equal(model.mostRecentSession(sessions).skillId, "b");
  assert.equal(sessions[0].id, a.id);
  const newer = { ...b, id: "newer", createdAt: "2026-11-17T15:00:00Z" };
  assert.equal(model.mostRecentSession([b, newer]).id, "newer");
  assert.equal(model.mostRecentSession([]), null);
});

test("focusing a skill isolates its activity and leaves all progress unchanged", () => {
  const state = {
    ...model.EMPTY_STATE,
    skills: [skill("a", 0), skill("b", 1)],
    sessions: [
      session("2026-11-17", "a", 3600),
      session("2026-11-17", "b", 600),
      session("2026-11-16", "b", 1200),
    ],
  };
  const before = JSON.stringify(state);
  const focus = model.focusSkill(state, "b", "2026-11-17");
  assert.equal(focus.skill.name, "b");
  assert.equal(focus.skill.seconds, 1800);
  assert.equal(focus.skill.streak, 2);
  assert.equal(focus.sessions.length, 2);
  assert.ok(focus.sessions.every((s) => s.skillId === "b"));
  const activity = model.activityTimeline(
    [focus.skill],
    focus.sessions,
    "2026-11-17",
    "weeks",
  );
  assert.equal(
    activity.buckets.reduce((sum, bucket) => sum + bucket.seconds, 0),
    1800,
  );
  assert.equal(model.mostPractised(state, "2026-11-17").id, "a");
  assert.equal(model.focusSkill(state, "missing", "2026-11-17"), null);
  assert.equal(JSON.stringify(state), before);
});

test("donut targets support one full ring, small arcs and large arcs without invalid coordinates", () => {
  const { donutPath } = load("app/growth-board/donut-path.ts");
  assert.equal(donutPath(0, 0), "");
  const full = donutPath(0, 100);
  assert.equal((full.match(/A 49 49/g) || []).length, 2);
  assert.equal((full.match(/A 37 37/g) || []).length, 2);
  assert.ok(donutPath(0, 75).includes("A 49 49 0 1 1"));
  assert.ok(donutPath(75, 25).includes("A 49 49 0 0 1"));
  for (const path of [full, donutPath(33.3, 0.1), donutPath(75, 25)])
    assert.ok(!/NaN|Infinity/.test(path));
});

test("donut renders individually focusable skill buttons with time, percentage and selection state", () => {
  const React = require("react"),
    { renderToStaticMarkup } = require("react-dom/server");
  const paths = load("app/growth-board/donut-path.ts");
  const Donut = load("app/growth-board/PracticeDonut.tsx", {
    "./model": model,
    "./donut-path": paths,
    "./tracker.module.css": { default: {} },
  }).default;
  const markup = renderToStaticMarkup(
    React.createElement(Donut, {
      skills: [
        { ...skill("a", 0), seconds: 1500 },
        { ...skill("b", 1), seconds: 4500 },
        { ...skill("c", 2), seconds: 0 },
      ],
      selectedId: "b",
      onSelect: () => {},
    }),
  );
  assert.equal((markup.match(/role="button"/g) || []).length, 2);
  assert.equal((markup.match(/tabindex="0"/g) || []).length, 2);
  assert.ok(markup.includes("a: 25m, 25% of learning time"));
  assert.ok(markup.includes("b: 1h 15m, 75% of learning time"));
  assert.equal((markup.match(/aria-pressed="true"/g) || []).length, 1);
  assert.ok(
    markup.includes("b: 1h 15m, 75% of learning time. Show all skills"),
  );
  assert.ok(
    markup.includes("a: 25m, 25% of learning time. Show skill details"),
  );
});

test("focused skill detail renders its resource links and sessions without leaking other skills", () => {
  const React = require("react"),
    { renderToStaticMarkup } = require("react-dom/server");
  const css = { "./tracker.module.css": { default: {} } };
  const Resources = load("app/growth-board/SkillResources.tsx", {
    "./storage": {},
    ...css,
  }).default;
  const Modal = load("app/growth-board/TrackerModal.tsx", css).default;
  const Actions = load("app/growth-board/SkillActions.tsx", {
    "./storage": {},
    "./model": model,
    "./TrackerModal": { default: Modal },
    ...css,
  }).default;
  const DeleteButton = load("app/growth-board/DeleteSessionButton.tsx", {
    "./storage": {},
    "./model": model,
    "./TrackerModal": { default: Modal },
    ...css,
  }).default;
  const Detail = load("app/growth-board/SkillDetail.tsx", {
    "./model": model,
    "./SkillResources": { default: Resources },
    "./SkillComposer": { default: () => null },
    "./SkillActions": { default: Actions },
    "./DeleteSessionButton": { default: DeleteButton },
    ...css,
  }).default;
  const chosen = {
    ...skill("b", 1),
    resources: [
      { id: "guide", name: "Selected guide", url: "https://example.com/guide" },
    ],
  };
  const state = {
    ...model.EMPTY_STATE,
    skills: [
      skill("a", 0),
      chosen,
      { ...skill("nested", 2), parentId: chosen.id },
    ],
    sessions: [
      { ...session("2026-11-17", "a", 3600), notes: "Other skill notes" },
      { ...session("2026-11-17", "b", 600), notes: "Selected practice notes" },
    ],
  };
  const focused = model.focusSkill(state, "b", "2026-11-17");
  const markup = renderToStaticMarkup(
    React.createElement(Detail, {
      ...focused,
      allSkills: state.skills,
      stats: model.skillStats(state, "2026-11-17"),
      onSelect: () => {},
      onBack: () => {},
      onLog: () => {},
    }),
  );
  assert.ok(markup.includes("Selected guide"));
  assert.ok(markup.includes('href="https://example.com/guide"'));
  assert.ok(markup.includes("Selected practice notes"));
  assert.ok(!markup.includes("Other skill notes"));
  assert.ok(markup.includes("All skills"));
  assert.ok(markup.includes("Subskill"));
  assert.ok(markup.includes("nested"));
  assert.ok(markup.includes("Direct practice"));
  assert.ok(markup.includes("Add subskill"));
});

test("older saves receive empty descriptions and active status without losing sessions or resources", () => {
  const state = {
    ...model.EMPTY_STATE,
    skills: [
      {
        ...skill("old", 0),
        resources: [{ id: "r", name: "Guide", url: "https://example.com" }],
      },
    ],
    sessions: [session("2026-11-14", "old")],
  };
  const raw = JSON.stringify(state),
    decoded = model.decodeTracker(raw);
  assert.equal(decoded.error, null);
  assert.equal(decoded.state.skills[0].description, "");
  assert.equal(decoded.state.skills[0].status, "active");
  assert.equal(decoded.state.sessions[0].id, state.sessions[0].id);
  assert.equal(decoded.state.skills[0].resources[0].name, "Guide");
  assert.equal(JSON.stringify(state), raw);
});

test("skill editing saves description and resource edits atomically, preserving earned time", async () => {
  const b = browserStore(),
    s = await b.store.addSkill("Spanish", 0, "Conversation");
  await b.store.logSession(s.id, 25, "2026-11-14", "Practice");
  await b.store.updateSkill(
    s.id,
    "Spanish conversation",
    "Daily conversations",
    [{ id: "r", name: "Course", url: "https://example.com/course" }],
  );
  const saved = b.read();
  assert.equal(saved.skills[0].description, "Daily conversations");
  assert.equal(saved.skills[0].name, "Spanish conversation");
  assert.equal(saved.skills[0].resources[0].name, "Course");
  assert.equal(model.skillStats(saved, "2026-11-14")[0].seconds, 1500);
  await assert.rejects(
    b.store.updateSkill(s.id, "Bad", "", [
      { id: "bad", name: "Unsafe", url: "javascript:alert(1)" },
    ]),
    /valid http/,
  );
  assert.equal(b.read().skills[0].name, "Spanish conversation");
});

test("archiving and deleting cards frees slots but preserves historical sessions and totals", async () => {
  const b = browserStore(),
    s = await b.store.addSkill("Spanish", 0);
  await b.store.logSession(s.id, 25, "2026-11-14", "Practice");
  await b.store.deactivateSkill(s.id, "archived");
  assert.equal(model.activeSkills(b.read().skills).length, 0);
  assert.equal(b.read().sessions.length, 1);
  const next = await b.store.addSkill("Guitar");
  assert.equal(next.slot, 0);
  assert.equal(model.decodeTracker(JSON.stringify(b.read())).error, null);
  await b.store.restoreSkill(s.id);
  assert.equal(model.activeSkills(b.read().skills).length, 2);
  assert.equal(
    new Set(model.activeSkills(b.read().skills).map((s) => s.slot)).size,
    2,
  );
  await b.store.deactivateSkill(s.id, "deleted");
  assert.equal(
    b.read().skills.find((item) => item.id === s.id).status,
    "deleted",
  );
  assert.equal(model.mostPractised(b.read(), "2026-11-14").id, s.id);
  assert.equal(
    model.practiceBreakdown(model.skillStats(b.read(), "2026-11-14"))[0]
      .seconds,
    1500,
  );
  await assert.rejects(
    b.store.logSession(s.id, 25, "2026-11-14", ""),
    /Choose a skill/,
  );
  await assert.rejects(b.store.restoreSkill(s.id), /Only archived/);
  await assert.rejects(
    b.store.deactivateSkill(s.id, "archived"),
    /already been deleted/,
  );
});

test("archive and delete cannot discard an active timer and restoring respects six active skills", async () => {
  const b = browserStore(),
    s = await b.store.addSkill("Spanish");
  const timer = await b.store.startTimer(s.id, 25, "");
  await assert.rejects(
    b.store.deactivateSkill(s.id, "archived"),
    /Finish or cancel/,
  );
  assert.equal(b.read().activeTimer.id, timer.id);
  await b.store.cancelTimer(timer.id);
  await b.store.deactivateSkill(s.id, "archived");
  for (let i = 0; i < 6; i++) await b.store.addSkill("Skill " + i);
  await assert.rejects(b.store.restoreSkill(s.id), /six active/);
  assert.equal(model.activeSkills(b.read().skills).length, 6);
  assert.equal(model.visibleSkillSlots(b.read().skills).length, 6);
});

test("deleting one or all session entries preserves time, streak and activity across reloads", async () => {
  const b = browserStore(),
    a = await b.store.addSkill("Spanish"),
    other = await b.store.addSkill("Guitar");
  await b.store.logSession(a.id, 25, "2026-11-13", "Private detailed notes");
  await b.store.logSession(a.id, 45, "2026-11-14", "More notes");
  await b.store.logSession(other.id, 60, "2026-11-14", "Guitar");
  const first = b.read().sessions.find((s) => s.skillId === a.id);
  await b.store.deleteSession(first.id);
  assert.equal(b.read().sessions.length, 2);
  assert.equal(b.read().retainedPractice.length, 1);
  assert.ok(!("notes" in b.read().retainedPractice[0]));
  await b.store.deleteSession(first.id);
  assert.equal(b.read().retainedPractice.length, 1);
  const remaining = b.read().sessions.find((s) => s.skillId === a.id);
  await b.store.deleteSession(remaining.id, true);
  const decoded = model.decodeTracker(JSON.stringify(b.read()));
  assert.equal(decoded.error, null);
  const state = decoded.state;
  assert.equal(state.sessions.length, 1);
  assert.equal(state.sessions[0].skillId, other.id);
  assert.equal(
    model.skillStats(state, "2026-11-14").find((s) => s.id === a.id).seconds,
    4200,
  );
  assert.equal(
    model.currentStreak(model.practiceHistory(state), "2026-11-14"),
    2,
  );
  assert.equal(model.focusSkill(state, a.id, "2026-11-14").sessions.length, 0);
  assert.equal(model.focusSkill(state, a.id, "2026-11-14").activity.length, 2);
  assert.equal(
    model
      .weeklyActivity(model.practiceHistory(state), "2026-11-14")
      .weeks.reduce((sum, w) => sum + w.seconds, 0),
    7800,
  );
});

test("delete all sessions only removes the chosen skill's entries and rejects duplicated time credits", async () => {
  const b = browserStore(),
    a = await b.store.addSkill("A"),
    other = await b.store.addSkill("B");
  await b.store.logSession(a.id, 25, "2026-11-14", "A1");
  await b.store.logSession(a.id, 25, "2026-11-14", "A2");
  await b.store.logSession(other.id, 25, "2026-11-14", "B");
  const id = b.read().sessions.find((s) => s.skillId === a.id).id;
  assert.equal(await b.store.deleteSession(id, true), 2);
  assert.equal(b.read().sessions.length, 1);
  const invalid = b.read();
  invalid.retainedPractice.push(invalid.retainedPractice[0]);
  assert.ok(model.decodeTracker(JSON.stringify(invalid)).error);
});

test("navbar scrolls out naturally before revealing only on upward motion", () => {
  const { INITIAL_HEADER, nextHeaderMotion } = load(
    "app/growth-board/scroll-header.ts",
  );
  let state = nextHeaderMotion(INITIAL_HEADER, 40, 70);
  assert.equal(state.floating, false);
  state = nextHeaderMotion(state, 100, 70);
  assert.equal(state.floating, true);
  assert.equal(state.visible, false);
  assert.equal(state.animated, false);
  state = nextHeaderMotion(state, 97, 70);
  assert.equal(state.visible, false);
  state = nextHeaderMotion(state, 92, 70);
  assert.equal(state.visible, true);
  assert.equal(state.animated, true);
  state = nextHeaderMotion(state, 95, 70);
  assert.equal(state.visible, true);
  state = nextHeaderMotion(state, 100, 70);
  assert.equal(state.visible, false);
});

test("navbar remains revealed approaching the top, resets at the top and handles restored scroll", () => {
  const { INITIAL_HEADER, nextHeaderMotion } = load(
    "app/growth-board/scroll-header.ts",
  );
  let state = nextHeaderMotion(INITIAL_HEADER, 500, 70);
  assert.equal(state.visible, false);
  state = nextHeaderMotion(state, 480, 70);
  assert.equal(state.visible, true);
  state = nextHeaderMotion(state, 30, 70);
  assert.equal(state.floating, true);
  assert.equal(state.visible, true);
  state = nextHeaderMotion(state, 0, 70);
  assert.equal(state.floating, false);
  assert.equal(state.animated, false);
  assert.equal(nextHeaderMotion(state, -10, 70).y, 0);
});

test("nested skills roll up time and partition each donut level without double counting", () => {
  const a = skill("a", 0),
    b = { ...skill("b", 1), parentId: "a" },
    c = { ...skill("c", 2), parentId: "b" };
  const state = {
    ...model.EMPTY_STATE,
    skills: [a, b, c],
    sessions: [
      session("2026-11-14", "a", 600),
      session("2026-11-14", "b", 1200),
      session("2026-11-14", "c", 1800),
    ],
  };
  const stats = model.skillStats(state, "2026-11-14");
  assert.equal(stats[0].seconds, 3600);
  assert.equal(stats[1].seconds, 3000);
  assert.equal(stats[1].ownSeconds, 1200);
  for (const [id, total] of [
    [null, 3600],
    ["a", 3600],
    ["b", 3000],
    ["c", 1800],
  ])
    assert.equal(
      model.skillDistribution(stats, id).reduce((sum, s) => sum + s.seconds, 0),
      total,
    );
  assert.equal(model.focusSkill(state, "b", "2026-11-14").sessions.length, 2);
  assert.equal(model.mostPractised(state, "2026-11-14").id, "a");
  assert.equal(
    model
      .skillTrail(state.skills, "c")
      .map((s) => s.id)
      .join("/"),
    "a/b/c",
  );
  assert.equal(model.visibleSkillSlots(state.skills).join(","), "0,1");
  assert.equal(model.decodeTracker(JSON.stringify(state)).error, null);
  for (const parentId of ["missing", "c"]) {
    const bad = { ...state, skills: [{ ...a, parentId }, b, c] };
    assert.ok(model.decodeTracker(JSON.stringify(bad)).error);
  }
});

test("subskills work beyond six root slots and validate sibling names and parent lifecycle", async () => {
  const { store, read } = browserStore();
  const roots = [];
  for (let i = 0; i < 6; i++) roots.push(await store.addSkill(`Root ${i}`));
  await assert.rejects(store.addSkill("Seventh"), /six/);
  const child = await store.addSkill("Python", undefined, "", roots[0].id);
  const grandchild = await store.addSkill("Basics", undefined, "", child.id);
  await store.addSkill("Python", undefined, "", roots[1].id);
  await assert.rejects(
    store.addSkill("Python", undefined, "", roots[0].id),
    /already/,
  );
  await store.logSession(grandchild.id, 25, "2026-11-14", "");
  assert.equal(
    model.focusSkill(read(), roots[0].id, "2026-11-14").skill.seconds,
    1500,
  );
  await store.startTimer(grandchild.id, 25, "");
  await assert.rejects(store.deactivateSkill(roots[0].id, "archived"), /timer/);
  await store.cancelTimer(read().activeTimer.id);
  await store.deactivateSkill(roots[0].id, "archived");
  assert.equal(
    read().skills.find((s) => s.id === grandchild.id).status,
    "archived",
  );
  await assert.rejects(store.restoreSkill(child.id), /parent/);
  await store.restoreSkill(roots[0].id);
  await store.restoreSkill(child.id);
  await store.restoreSkill(grandchild.id);
  await store.deleteSession(read().sessions[0].id);
  assert.equal(
    model.focusSkill(read(), roots[0].id, "2026-11-14").skill.seconds,
    1500,
  );
  await store.deactivateSkill(child.id, "deleted");
  assert.equal(
    read().skills.find((s) => s.id === grandchild.id).status,
    "deleted",
  );
  assert.equal(model.decodeTracker(JSON.stringify(read())).error, null);
});

function extensionBridge(browser) {
  const responses = [];
  let receive;
  const window = {
    addEventListener: (_type, callback) => { receive = callback; },
    removeEventListener: () => {},
    postMessage: (message) => responses.push(message),
  };
  const bridge = load('app/growth-board/ExtensionBridge.tsx', {
    react: { useEffect: (effect) => effect() },
    './model': model,
    './storage': browser.store,
  }, { window, location: { origin: 'https://board.example' }, localStorage: browser.localStorage });
  bridge.default();
  return {
    responses,
    send: async (command, payload = {}, overrides = {}) => {
      await receive({ source: window, origin: 'https://board.example', data: {
        channel: 'growth-board-extension-request', id: crypto.randomUUID(), command, payload,
      }, ...overrides });
      return responses.at(-1);
    },
  };
}
test('extension bridge ignores foreign origins and returns only narrow active skill data', async () => {
  const b = browserStore();
  const skill = await b.store.addSkill('Piano', undefined, 'Private description');
  await b.store.addResource(skill.id, 'Personal resource', 'https://example.com/private');
  const bridge = extensionBridge(b);
  await bridge.send('snapshot', {}, { origin: 'https://attacker.example' });
  await bridge.send('snapshot', {}, { source: {} });
  assert.equal(bridge.responses.length, 0);
  const response = await bridge.send('snapshot');
  assert.equal(response.result.skills[0].name, 'Piano');
  assert.equal(response.result.skills[0].description, undefined);
  assert.equal(response.result.skills[0].resources, undefined);
  assert.equal(response.result.sessions, undefined);
});
test('extension bridge reuses real timer persistence and acknowledges completion idempotently', async () => {
  const b = browserStore();
  const skill = await b.store.addSkill('Piano');
  const bridge = extensionBridge(b);
  const started = await bridge.send('start', { skillId: skill.id, minutes: 1, notes: 'Scales' });
  const timerId = started.result.timer.id;
  b.advance(60000);
  const finished = await bridge.send('finish', { timerId });
  assert.equal(finished.result.saved, true);
  assert.equal(finished.result.timer, null);
  assert.equal(b.read().sessions[0].durationSeconds, 60);
  assert.equal(b.read().sessions[0].source, 'timer');
  assert.equal((await bridge.send('finish', { timerId })).result.saved, true);
  assert.equal(b.read().sessions.length, 1);
});
test('extension bridge rejects malformed mutations without modifying the app store', async () => {
  const b = browserStore();
  const skill = await b.store.addSkill('Piano');
  const before = b.localStorage.getItem(b.store.STORAGE_KEY);
  const bridge = extensionBridge(b);
  assert.match((await bridge.send('start', { skillId: skill.id, minutes: '25', notes: '' })).error, /Invalid/);
  assert.match((await bridge.send('finish', { timerId: 7 })).error, /Invalid/);
  assert.match((await bridge.send('replaceAll', {})).error, /Unknown/);
  assert.equal(b.localStorage.getItem(b.store.STORAGE_KEY), before);
});
