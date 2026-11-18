import { appAddress, blockedDomains, blockingRules, matchesDomain } from './core.mjs';

let queue = Promise.resolve();
const serial = (work) => {
  const task = queue.then(work, work);
  queue = task.catch(() => {});
  return task;
};
const read = async () => (await chrome.storage.local.get('focus')).focus ?? { settings: {}, skills: [], timer: null };
const write = (focus) => chrome.storage.local.set({ focus });

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
    await chrome.alarms.create('focus-end', { when: focus.timer.endsAt });
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
  const previousId = focus.timer?.id;
  // Drop network rules at the deadline even when the app is unavailable.
  await enforce(focus);
  try {
    let snapshot;
    if (focus.timer && focus.timer.endsAt <= Date.now()) {
      snapshot = await board(focus, 'finish', { timerId: focus.timer.id });
      focus.lastResult = snapshot.saved ? 'Session saved in Growth Board. Time for a break.'
        : 'The timer was cancelled or removed in Growth Board; no session was added.';
      focus.breakEndsAt = snapshot.saved ? Date.now() + 5 * 60000 : null;
    } else snapshot = await board(focus);
    focus.skills = snapshot.skills;
    focus.timer = snapshot.timer;
    focus.syncError = '';
    focus.lastSyncedAt = Date.now();
  } catch (error) {
    focus.syncError = error.message;
    // Retain the expired timer as an outbox item until the board acknowledges it.
  }
  await write(focus);
  await enforce(focus, previousId !== focus.timer?.id);
  return focus;
}
async function handle(message) {
  let focus = await read();
  if (message.type === 'get') {
    await enforce(focus);
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
    const snapshot = await board(focus, 'start', {
      skillId: message.skillId, minutes: message.minutes, notes: message.notes,
    });
    focus.timer = snapshot.timer;
    focus.skills = snapshot.skills;
    focus.lastResult = '';
    focus.breakEndsAt = null;
    await write(focus); // Persist deadline before installing rules or alarms.
    await enforce(focus, true);
  } else if (message.type === 'cancel') {
    if (focus.timer) {
      if (focus.timer.endsAt <= Date.now()) return reconcile(focus);
      const snapshot = await board(focus, 'cancel', { timerId: focus.timer.id });
      focus.timer = snapshot.timer;
      focus.lastResult = 'Session cancelled. No practice time was recorded.';
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
