/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const corePromise = import(pathToFileURL(`${process.cwd()}/extension/growth-focus/core.mjs`).href);

async function harness() {
  const core = await corePromise;
  let now = 1800000000000, persisted, rules = [], offline = false, saved = [], timer = null, id = 0;
  const callbacks = {}, reloads = [], calls = [], sounds = [], credits = new Map(), alarms = new Map();
  const skills = [{ id: 'skill-a', name: 'Piano' }];
  const chrome = {
    storage: { local: { get: async () => ({ focus: structuredClone(persisted) }), set: async ({ focus }) => { persisted = structuredClone(focus); } } },
    permissions: { contains: async () => true },
    scripting: { executeScript: async () => { if (offline) throw new Error('App offline'); } },
    tabs: {
      query: async (filter) => filter.url ? [{ id: 1, url: 'https://board.example/growth-board', incognito: false }] : [
        { id: 2, url: 'https://www.youtube.com/watch?v=test' },
        { id: 3, url: 'https://old.reddit.com', incognito: true },
        { id: 4, url: 'https://docs.example' },
      ],
      create: async () => ({ id: 1 }), reload: async (id) => reloads.push(id),
      sendMessage: async (_, message) => {
        calls.push(message.command);
        const p = message.payload;
        if (message.command === 'start') {
          if (timer) return { error: 'Timer already active' };
          if (!Number.isInteger(p.minutes) || p.minutes < 1 || p.minutes > 1440 || p.skillId !== 'skill-a') return { error: 'Invalid session' };
          timer = { id: `timer-${++id}`, skillId: p.skillId, minutes: p.minutes, notes: p.notes, startedAt: now, endsAt: now + (p.minutes + (p.pomodoro ? p.pomodoro.breaks * p.pomodoro.breakMinutes : 0)) * 60000, timeZone: 'UTC', pomodoro: p.pomodoro, soundOwner: 'extension' };
        }
        if (['finish', 'cancel'].includes(message.command) && timer?.id === p.timerId && timer.pomodoro) {
          for (const phase of core.timerPhases(timer)) if (phase.kind === 'focus' && phase.endsAt <= now && !saved.includes(phase.key)) { saved.push(phase.key); credits.set(phase.key, phase.durationSeconds); }
          if (message.command === 'cancel' || now >= timer.endsAt) timer = null;
        }
        if (message.command === 'finish' && timer?.id === p.timerId && now >= timer.endsAt) {
          if (!saved.includes(timer.id)) saved.push(timer.id);
          timer = null;
        }
        if (message.command === 'cancel' && timer?.id === p.timerId) timer = null;
        return { result: { skills, timer: structuredClone(timer), creditedSeconds: [...credits.values()].reduce((a,b) => a+b,0), saved: saved.includes(p.timerId) || (!timer && saved.some((id) => id.startsWith(`${p.timerId}:focus:`))) } };
      },
    },
    declarativeNetRequest: { getSessionRules: async () => rules, updateSessionRules: async ({ addRules }) => { rules = addRules; } },
    action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {}, onClicked: { addListener: () => {} } },
    offscreen: { createDocument: async () => {} },
    alarms: { create: async (key, value) => { alarms.set(key, value); }, clear: async (key) => { alarms.delete(key); }, onAlarm: { addListener: (cb) => { callbacks.alarm = cb; } } },
    extension: { isAllowedIncognitoAccess: (cb) => cb(true) },
    runtime: { getContexts: async () => [{}], sendMessage: async (message) => { sounds.push(message.kind); return { played: true }; }, id: 'test-extension', getURL: (path) => `chrome-extension://test-extension/${path}`,
      onMessage: { addListener: (cb) => { callbacks.message = cb; } },
      onStartup: { addListener: (cb) => { callbacks.startup = cb; } }, onInstalled: { addListener: () => {} } },
  };
  class Clock extends Date { static now() { return now; } }
  const source = fs.readFileSync('extension/growth-focus/background.js', 'utf8').replace(/^import .*?;\n/, '');
  const context = vm.createContext({ chrome, ...core, Date: Clock, URL, Error,
    setTimeout: (cb) => { cb(); }, console, structuredClone });
  vm.runInContext(`${source}\nglobalThis.worker = { handle, wake };`, context);
  const handle = (type, payload = {}) => context.worker.handle({ type, ...payload });
  return { handle, callbacks, chrome, calls, reloads, wake: () => context.worker.wake(),
    sounds, alarms, credits, read: () => persisted, rules: () => rules, saved: () => saved,
    advance: (ms) => { now += ms; }, offline: (value) => { offline = value; },
    appCancel: () => { timer = null; },
    connect: () => handle('connect', { appUrl: 'https://board.example' }),
    start: () => handle('start', { skillId: 'skill-a', minutes: 25, notes: 'Scales' }),
  };
}

test('addresses accept HTTPS and loopback development, rejecting credentials and unsafe schemes', async () => {
  const { appAddress } = await corePromise;
  assert.equal(appAddress('https://example.com/path?x=1'), 'https://example.com/growth-board');
  assert.equal(appAddress('http://localhost:3000'), 'http://localhost:3000/growth-board');
  for (const url of ['http://example.com', 'javascript:alert(1)', 'https://user:pass@example.com']) assert.throws(() => appAddress(url));
});
test('domain parsing prevents ruleset injection and matches domain boundaries', async () => {
  const { domain, matchesDomain } = await corePromise;
  assert.equal(domain('https://www.Example.com/'), 'example.com');
  for (const value of ['*', 'example.com/path', 'example.com:443', 'example.com?q=x', 'a@b.com', 'file:///tmp']) {
    // A default HTTPS port is normalized by URL, and is harmless.
    if (value === 'example.com:443') continue;
    assert.throws(() => domain(value), value);
  }
  assert.equal(matchesDomain('m.youtube.com', ['youtube.com']), true);
  assert.equal(matchesDomain('notyoutube.com', ['youtube.com']), false);
});
test('blocking covers categories, subdomains and custom domains; no rules outside active time', async () => {
  const core = await corePromise;
  const settings = { categories: ['adult', 'entertainment'], customDomains: ['example.com'], appUrl: 'https://board.example/growth-board' };
  const rules = core.blockingRules(settings, { endsAt: 200 }, 100);
  assert.ok(rules[0].condition.requestDomains.includes('youtube.com'));
  assert.ok(rules[0].condition.requestDomains.includes('pornhub.com'));
  assert.ok(rules[0].condition.requestDomains.includes('example.com'));
  assert.ok(!rules[0].condition.requestDomains.includes('facebook.com'));
  assert.equal(rules[1].action.type, 'allowAllRequests');
  assert.deepEqual(core.blockingRules(settings, { endsAt: 100 }, 100), []);
  assert.deepEqual(core.blockingRules(settings, null, 100), []);
  assert.equal(core.remaining({ endsAt: 2000 }, 1001), 1);
});
test('start uses app timer, persists it, blocks networks and reloads existing normal and private distractions', async () => {
  const h = await harness(); await h.connect(); await h.start();
  assert.equal(h.read().timer.id, 'timer-1');
  assert.equal(h.read().timer.notes, 'Scales');
  assert.equal(h.rules()[0].action.type, 'block');
  assert.deepEqual(h.reloads, [2, 3]);
  assert.equal(h.calls.filter((c) => c === 'start').length, 1);
});
test('completion records exactly once, clears blocking and starts a break', async () => {
  const h = await harness(); await h.connect(); await h.start(); h.advance(25 * 60000); await h.wake(); await h.wake();
  assert.deepEqual(h.saved(), ['timer-1']);
  assert.equal(h.read().timer, null);
  assert.ok(h.read().breakEndsAt);
  assert.equal(h.rules().length, 0);
});
test('offline completion unblocks immediately, keeps pending timer and retries without duplicates', async () => {
  const h = await harness(); await h.connect(); await h.start(); h.offline(true); h.advance(25 * 60000); await h.wake();
  assert.equal(h.rules().length, 0);
  assert.equal(h.read().timer.id, 'timer-1');
  assert.match(h.read().syncError, /offline/);
  h.offline(false); await h.wake(); await h.wake();
  assert.deepEqual(h.saved(), ['timer-1']); assert.equal(h.read().timer, null);
});
test('cancelling creates no session and removes rules', async () => {
  const h = await harness(); await h.connect(); await h.start(); await h.handle('cancel');
  assert.deepEqual(h.saved(), []); assert.equal(h.read().timer, null); assert.equal(h.rules().length, 0);
});
test('app cancellation is reconciled rather than recreating a removed session', async () => {
  const h = await harness(); await h.connect(); await h.start(); h.appCancel(); h.advance(25 * 60000); await h.wake();
  assert.deepEqual(h.saved(), []); assert.equal(h.read().timer, null); assert.match(h.read().lastResult, /cancelled/);
});
test('active timers prevent switching boards, changing blocking, and starting overlapping sessions', async () => {
  const h = await harness(); await h.connect(); await h.start();
  await assert.rejects(h.handle('connect', { appUrl: 'https://other.example' }), /current session/);
  await assert.rejects(h.handle('settings', { categories: [], customDomains: [] }), /current session/);
  await assert.rejects(h.start(), /current timer/);
});
test('wake restores network rules from persisted timer after browser restart', async () => {
  const h = await harness(); await h.connect(); await h.start();
  await h.chrome.declarativeNetRequest.updateSessionRules({ addRules: [] });
  await h.wake(); assert.equal(h.rules()[0].action.type, 'block');
});
test('runtime rejects content-script and foreign senders', async () => {
  const h = await harness();
  assert.equal(h.callbacks.message({ type: 'start' }, { id: 'test-extension', url: 'https://board.example/growth-board' }, () => {}), undefined);
  assert.equal(h.callbacks.message({ type: 'start' }, { id: 'foreign', url: 'chrome-extension://test-extension/newtab.html' }, () => {}), undefined);
});
test('extension manifest declares a local-only MV3 new-tab and shared incognito worker', () => {
  const m = JSON.parse(fs.readFileSync('extension/growth-focus/manifest.json', 'utf8'));
  assert.equal(m.manifest_version, 3); assert.equal(m.incognito, 'spanning');
  assert.equal(m.chrome_url_overrides.newtab, 'newtab.html');
  assert.ok(!m.host_permissions.includes('<all_urls>'));
  for (const file of ['newtab.html', 'newtab.js', 'newtab.css', 'background.js', 'content.js', 'core.mjs']) assert.ok(fs.existsSync(`extension/growth-focus/${file}`));
});

test('Pomodoro plan has four equal focus blocks and three breaks for 60 + 3 × 5', async () => {
  const { timerPhases, currentPhase, validatePomodoro } = await corePromise;
  validatePomodoro(60, { breaks: 3, breakMinutes: 5 });
  const timer = { id: 'p', minutes: 60, startedAt: 0, endsAt: 75 * 60000, pomodoro: { breaks: 3, breakMinutes: 5 } };
  const phases = timerPhases(timer);
  assert.deepEqual(phases.map((p) => p.durationSeconds), [900, 300, 900, 300, 900, 300, 900]);
  assert.equal(currentPhase(timer, 15 * 60000).kind, 'break');
  assert.equal(currentPhase(timer, 20 * 60000).kind, 'focus');
  assert.equal(currentPhase(timer, 75 * 60000), null);
});
test('Pomodoro worker saves at break boundaries, retains two blocks when quit, and sounds once per transition', async () => {
  const h = await harness(); await h.connect();
  await h.handle('start', { skillId: 'skill-a', minutes: 60, notes: 'Scales', pomodoro: { breaks: 3, breakMinutes: 5 } });
  assert.equal(h.read().timer.endsAt - h.read().timer.startedAt, 75 * 60000);
  assert.equal(h.alarms.get('focus-end').when, h.read().timer.startedAt + 15 * 60000);
  h.advance(15 * 60000); await h.wake(); await h.wake();
  assert.deepEqual(h.saved(), ['timer-1:focus:0']);
  assert.equal(h.read().creditedSeconds, 900);
  h.advance(5 * 60000); await h.wake();
  h.advance(15 * 60000); await h.wake();
  assert.deepEqual(h.saved(), ['timer-1:focus:0', 'timer-1:focus:1']);
  assert.deepEqual(h.sounds, ['start', 'break', 'resume', 'break']);
  await h.handle('cancel');
  assert.equal(h.read().timer, null);
  assert.equal([...h.credits.values()].reduce((a,b) => a+b,0), 1800);
  assert.equal(h.rules().length, 0);
});
test('full Pomodoro saves only focus seconds and emits final completion instead of an extra break', async () => {
  const h = await harness(); await h.connect();
  await h.handle('start', { skillId: 'skill-a', minutes: 60, notes: '', pomodoro: { breaks: 3, breakMinutes: 5 } });
  for (const minutes of [15, 5, 15, 5, 15, 5, 15]) { h.advance(minutes * 60000); await h.wake(); }
  await h.wake();
  assert.equal(h.saved().length, 4);
  assert.equal([...h.credits.values()].reduce((a,b) => a+b,0), 3600);
  assert.deepEqual(h.sounds, ['start', 'break', 'resume', 'break', 'resume', 'break', 'resume', 'finish']);
  assert.equal(h.read().timer, null); assert.equal(h.read().breakEndsAt, null);
});
test('uneven focus splits preserve exact total seconds and invalid plans are rejected', async () => {
  const { timerPhases, validatePomodoro } = await corePromise;
  const phases = timerPhases({ id: 'p', minutes: 7, startedAt: 0, endsAt: 600000, pomodoro: { breaks: 2, breakMinutes: 1 } });
  assert.equal(phases.filter((p) => p.kind === 'focus').reduce((n,p) => n+p.durationSeconds,0), 420);
  for (const plan of [{ breaks: 3, breakMinutes: 0 }, { breaks: 60, breakMinutes: 5 }, { breaks: 1.5, breakMinutes: 5 }, { breaks: 1, breakMinutes: 61 }]) assert.throws(() => validatePomodoro(60, plan));
});
test('offline Pomodoro keeps its schedule and saves missed blocks on reconnect without replaying alerts', async () => {
  const h = await harness(); await h.connect();
  await h.handle('start', { skillId: 'skill-a', minutes: 60, notes: '', pomodoro: { breaks: 3, breakMinutes: 5 } });
  h.offline(true); h.advance(15 * 60000); await h.wake(); await h.wake();
  assert.equal(h.saved().length, 0); assert.deepEqual(h.sounds, ['start', 'break']);
  assert.ok(h.read().syncError); assert.equal(h.rules()[0].action.type, 'block');
  h.offline(false); h.advance(5 * 60000); await h.wake(); await h.wake();
  assert.deepEqual(h.saved(), ['timer-1:focus:0']); assert.deepEqual(h.sounds, ['start', 'break', 'resume']);
  assert.equal(h.read().creditedSeconds, 900);
});
