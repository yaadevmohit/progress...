/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, require: name => dependencies[name] ?? require(name), Date, JSON, Set, Map, Intl, URL });
  return exports;
}
const timer = load('extension/growth-focus/timer-plan.mjs');
const model = load('app/growth-board/model.ts', { '../../extension/growth-focus/timer-plan.mjs': timer });
test('all 1,000 boards round-trip through the actual app decoder within the storage budget', async () => {
  const { makeBoard, profile, USER_COUNT, seedSummary } = await import('../scripts/lib/mock-learners.mjs');
  const emails = new Set(), names = new Set(), months = new Set();
  for (let i = 0; i < USER_COUNT; i++) {
    const user = profile(i);
    emails.add(user.email); names.add(user.name);
    assert.match(user.email, /^growth\.mock\.\d{4}@example\.com$/);
    const board = makeBoard(i, '2026-11-23');
    assert.equal(model.decodeTracker(JSON.stringify(board)).error, null);
    const oldest = board.sessions.at(-1).activityDate;
    const age = (2026 - Number(oldest.slice(0, 4))) * 12 + 11 - Number(oldest.slice(5, 7));
    assert.ok(age >= 1 && age <= 24);
    months.add(age);
    assert.equal(board.sessions[0].activityDate, '2026-11-23');
    for (const session of board.sessions) {
      assert.ok(session.activityDate >= oldest && session.activityDate <= '2026-11-23');
      assert.ok(board.skills.some(skill => skill.id === session.skillId));
    }
  }
  assert.equal(emails.size, 1000); assert.equal(names.size, 1000); assert.equal(months.size, 24);
  const summary = seedSummary('2026-11-23');
  assert.ok(summary.boardBytes < 32 * 1024 ** 2);
  assert.ok(summary.maxBoardBytes < 512 * 1024);
  assert.equal(summary.fileStorageBytes, 0);
});
test('month boundaries are clamped and generation is reproducible', async () => {
  const { makeBoard } = await import('../scripts/lib/mock-learners.mjs');
  assert.deepEqual(makeBoard(0, '2026-03-31'), makeBoard(0, '2026-03-31'));
  assert.equal(makeBoard(0, '2026-03-31').sessions.at(-1).activityDate, '2026-02-28');
  assert.equal(makeBoard(0, '2024-03-31').sessions.at(-1).activityDate, '2024-02-29');
  assert.throws(() => makeBoard(1000, '2026-11-23'));
  assert.throws(() => makeBoard(0, '2026-02-30'));
});
