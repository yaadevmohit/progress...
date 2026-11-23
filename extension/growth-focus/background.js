import { appAddress, blockedDomains, blockingRules, matchesDomain, currentPhase, validatePomodoro } from './core.mjs';

let queue = Promise.resolve();
const serial = (work) => {
  const task = queue.then(work, work);
  queue = task.catch(() => {});
  return task;
};
const read = async () => (await chrome.storage.local.get('focus')).focus ?? { settings: {}, skills: [], timer: null };
const write = (focus) => chrome.storage.local.set({ focus });

async function announce(focus, kind, key) {
  if (focus.alertKey === key) return;
  focus.alertKey = key;
  await write(focus); // Multiple tabs and alarm retries must not replay a chime.
  try {
    const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    if (!contexts.length) await chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play focus start, break, resume, and completion sounds while dashboard tabs are closed.' });
    const response = await chrome.runtime.sendMessage({ type: 'play-alert', kind });
    focus.soundError = response?.error ?? '';
  } catch { focus.soundError = 'Sound could not play. Timer and session saving are still active.'; }
  await write(focus);
}

async function board(focus, command = 'snapshot', payload = {}) {
  if (!focus.settings.appUrl) throw new Error('Connect your Growth Board address in Settings first.');
  const url = appAddress(focus.settings.appUrl);
  if (!await chrome.permissions.contains({ origins: [`${new URL(url).origin}/*`] })) {
    throw new Error('App access was removed. Reconnect in Settings.');
  }
  // Always use the regular profile's board, including requests from incognito.
  const tabs = await chrome.tabs.query({ url: `${new URL(url).origin}/*` });
  let tab = tabs.find((t) => !t.incognito && new URL(t.url).pathname.replace(/\/$/, '') === '/growth-board');
  if (!tab) tab = await chrome.tabs.create({ url, active: false });
  // Injection can race page loading/hydration; retries use fresh correlation IDs.
  // Mutation is sent only once after snapshot readiness, so a lost response
  // cannot accidentally create or cancel another timer.
  let ready = false;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'board-command', command: 'snapshot', payload: {} });
      if (response?.result) { ready = true; break; }
      if (response?.error && !response.error.includes('did not respond')) throw new Error(response.error);
    } catch (error) {
      if (attempt === 7) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  if (!ready) throw new Error('Open the updated Growth Board app and retry the connection.');
  const response = await chrome.tabs.sendMessage(tab.id, { type: 'board-command', command, payload });
  if (!response || response.error) throw new Error(response?.error ?? 'Growth Board disconnected. Retry sync.');
  return response.result;
}
async function enforce(focus, reload = false) {
  const old = await chrome.declarativeNetRequest.getSessionRules();
  await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: old.map((r) => r.id),
    addRules: blockingRules(focus.settings, focus.timer, Date.now()) });
  await chrome.action.setBadgeText({ text: focus.timer?.endsAt > Date.now() ? 'ON' : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#53735d' });
  if (focus.timer?.endsAt > Date.now()) {
    await chrome.alarms.create('focus-end', { when: currentPhase(focus.timer, Date.now())?.endsAt ?? focus.timer.endsAt });
    if (reload) {
      const domains = blockedDomains(focus.settings);
      const appHost = new URL(focus.settings.appUrl).hostname;
      // Re-request already open distractions so preloaded pages stop playing.
      // URLs (especially private URLs) are never saved or sent to the board.
      for (const tab of await chrome.tabs.query({})) {
        try {
          const host = new URL(tab.url).hostname;
          if (host !== appHost && matchesDomain(host, domains)) await chrome.tabs.reload(tab.id);
        } catch { /* A tab may close or be a protected browser page. */ }
      }
    }
  } else await chrome.alarms.clear('focus-end');
}
async function reconcile(focus) {
  const previousTimer = focus.timer;
  const previousId = previousTimer?.id;
  const previousPhaseKey = focus.phaseKey;
  // Drop network rules at the deadline even when the app is unavailable.
  await enforce(focus);
  try {
    let snapshot;
    if (focus.timer && (focus.timer.pomodoro || focus.timer.endsAt <= Date.now())) {
      snapshot = await board(focus, 'finish', { timerId: focus.timer.id });
      if (!snapshot.timer || snapshot.timer.id !== focus.timer.id) {
        focus.lastResult = snapshot.saved ? 'Session saved in Growth Board. Well done.'
          : focus.timer.pomodoro ? 'Pomodoro cancelled or ended. Previously completed focus blocks remain saved.' : 'The timer was cancelled or removed in Growth Board; no session was added.';
        focus.breakEndsAt = snapshot.saved && !focus.timer.pomodoro ? Date.now() + 5 * 60000 : null;
      }
    } else snapshot = await board(focus);
    focus.skills = snapshot.skills;
    focus.creditedSeconds = snapshot.creditedSeconds ?? 0;
    focus.timer = snapshot.timer;
    focus.syncError = '';
    focus.lastSyncedAt = Date.now();
  } catch (error) {
    focus.syncError = error.message;
    // Retain the expired timer as an outbox item until the board acknowledges it.
  }
  const phase = focus.timer ? currentPhase(focus.timer, Date.now()) : null;
  focus.phaseKey = phase?.key ?? (previousTimer ? `${previousTimer.id}:done` : null);
  await write(focus);
  if (previousTimer?.soundOwner === 'extension' && previousPhaseKey && previousPhaseKey !== focus.phaseKey) {
    const finished = Date.now() >= previousTimer.endsAt;
    if (phase && previousId === focus.timer?.id) await announce(focus, phase.kind === 'break' ? 'break' : 'resume', phase.key);
    else if (finished) await announce(focus, 'finish', `${previousTimer.id}:done`);
  }
  await enforce(focus, previousId !== focus.timer?.id);
  return focus;
}
async function handle(message) {
  let focus = await read();
  if (message.type === 'get') {
    if (focus.timer && focus.phaseKey !== (currentPhase(focus.timer, Date.now())?.key ?? `${focus.timer.id}:done`)) focus = await reconcile(focus);
    else await enforce(focus);
  } else if (message.type === 'connect') {
    if (focus.timer) throw new Error('Finish and sync the current session before changing app address.');
    const appUrl = appAddress(message.appUrl);
    if (!await chrome.permissions.contains({ origins: [`${new URL(appUrl).origin}/*`] })) {
      throw new Error('Grant access to this app address first.');
    }
    focus.settings.appUrl = appUrl;
    focus = await reconcile(focus);
  } else if (message.type === 'sync') {
    focus = await reconcile(focus);
  } else if (message.type === 'start') {
    focus = await reconcile(focus);
    if (focus.syncError) throw new Error(focus.syncError);
    if (focus.timer) throw new Error('Finish or cancel your current timer first.');
    if (message.pomodoro !== undefined) validatePomodoro(message.minutes, message.pomodoro);
    const snapshot = await board(focus, 'start', {
      skillId: message.skillId, minutes: message.minutes, notes: message.notes, pomodoro: message.pomodoro,
    });
    focus.timer = snapshot.timer;
    focus.skills = snapshot.skills;
    focus.lastResult = '';
    focus.creditedSeconds = 0;
    focus.breakEndsAt = null;
    await write(focus); // Persist deadline before installing rules or alarms.
    focus.phaseKey = currentPhase(focus.timer, Date.now())?.key;
    await write(focus);
    await enforce(focus, true);
    await announce(focus, 'start', focus.phaseKey);
  } else if (message.type === 'cancel') {
    if (focus.timer) {
      if (focus.timer.endsAt <= Date.now()) return reconcile(focus);
      const snapshot = await board(focus, 'cancel', { timerId: focus.timer.id });
      const wasPomodoro = !!focus.timer.pomodoro;
      focus.timer = snapshot.timer;
      focus.creditedSeconds = snapshot.creditedSeconds ?? 0;
      focus.lastResult = wasPomodoro ? 'Pomodoro ended. Completed focus blocks are saved; breaks and unfinished focus are excluded.' : 'Session cancelled. No practice time was recorded.';
      await write(focus);
      await enforce(focus);
    }
  } else if (message.type === 'settings') {
    if (focus.timer) throw new Error('Finish and sync the current session before changing the blocklist.');
    const settings = { ...focus.settings, categories: message.categories, customDomains: message.customDomains };
    if (!Array.isArray(settings.categories) || settings.categories.some((c) => !['social', 'entertainment', 'adult'].includes(c)) ||
        !Array.isArray(settings.customDomains) || settings.customDomains.length > 500) throw new Error('Invalid blocklist. Use up to 500 domains.');
    blockedDomains(settings); // Validate the full list before saving.
    focus.settings = settings;
    await write(focus);
  } else throw new Error('Unknown extension command.');
  return { ...focus, incognitoAllowed: await new Promise((resolve) => chrome.extension.isAllowedIncognitoAccess(resolve)) };
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  // Content scripts and arbitrary web pages cannot start timers or change settings.
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL('newtab.html'))) return;
  serial(() => handle(message)).then((result) => respond({ result }), (error) => respond({ error: error.message }));
  return true;
});
async function wake() {
  await chrome.alarms.create('focus-check', { periodInMinutes: 1 });
  const focus = await read();
  if (focus.timer) await reconcile(focus);
  else await enforce(focus);
}
chrome.alarms.onAlarm.addListener(() => { void serial(wake); });
chrome.runtime.onStartup.addListener(() => { void serial(wake); });
chrome.runtime.onInstalled.addListener(() => { void serial(wake); });
chrome.action.onClicked.addListener(() => {
  void (async () => {
    // A spanning extension cannot load its dashboard as a top-level private
    // page. The toolbar always opens a regular window, even when clicked there.
    const regular = (await chrome.windows.getAll({ windowTypes: ['normal'] })).find((window) => !window.incognito);
    const url = chrome.runtime.getURL('newtab.html');
    if (regular) await chrome.tabs.create({ url, windowId: regular.id });
    else await chrome.windows.create({ url, incognito: false });
  })();
});
