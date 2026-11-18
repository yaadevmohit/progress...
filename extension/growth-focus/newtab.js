import { appAddress, remaining } from './core.mjs';
const $ = (id) => document.getElementById(id);
let dashboard = {}, focus = {}, toastTimeout;
function toast(text) {
  $('message').textContent = text;
  $('message').hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { $('message').hidden = true; }, 7000);
}
const day = () => new Date().toLocaleDateString('en-CA');
async function edit(change) {
  await navigator.locks.request('growth-focus-dashboard', async () => {
    const current = (await chrome.storage.local.get('dashboard')).dashboard ?? {};
    change(current);
    await chrome.storage.local.set({ dashboard: current });
    dashboard = current;
  });
}
async function request(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({ type, ...payload });
  if (response?.error) throw new Error(response.error);
  if (!response?.result) throw new Error('Extension worker disconnected. Reload this tab.');
  focus = response.result;
  renderFocus();
  return focus;
}
function action(id, event, callback) {
  $(id).addEventListener(event, async (e) => {
    if (event === 'submit') e.preventDefault();
    const button = event === 'submit' ? e.target.querySelector('button') : e.currentTarget;
    if (button instanceof HTMLButtonElement) button.disabled = true;
    try { await callback(e); } catch (error) { toast(error.message); }
    finally { if (button instanceof HTMLButtonElement) button.disabled = false; }
  });
}
function duration(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
function tick() {
  const now = new Date();
  $('clock').textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: !dashboard.format24 });
  $('date').textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  $('greeting').textContent = `${greeting}${dashboard.name ? `, ${dashboard.name}` : ''}. Make room to grow.`;
  if (focus.timer) {
    const seconds = remaining(focus.timer);
    $('countdown').textContent = duration(seconds);
    $('timer-caption').textContent = seconds ? 'Your time is protected. One thing at a time.' : 'Session finished. Waiting for Growth Board to confirm the save…';
    $('cancel').hidden = !seconds;
  }
  $('break-status').textContent = focus.breakEndsAt > Date.now() && !focus.timer ? `Take a breath. Break: ${duration(Math.ceil((focus.breakEndsAt - Date.now()) / 1000))}` : '';
  if (dashboard.event?.date) {
    const target = new Date(`${dashboard.event.date}T00:00:00`);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.round((target - today) / 86400000);
    $('event-countdown').textContent = `${dashboard.event.name} · ${days === 0 ? 'today' : days > 0 ? `${days} day${days === 1 ? '' : 's'} to go` : `${-days} day${days === -1 ? '' : 's'} ago`}`;
  } else $('event-countdown').textContent = 'Make time for what matters.';
  if (document.activeElement !== $('intention')) {
    $('intention').value = dashboard.intention?.day === day() ? dashboard.intention.text : '';
    $('intention-done').checked = dashboard.intention?.day === day() && !!dashboard.intention.done;
  }
}
function renderFocus() {
  const selected = $('skill').value;
  $('skill').replaceChildren();
  if (!focus.skills?.length) $('skill').append(new Option('Add skills in Growth Board, then sync', ''));
  for (const skill of focus.skills ?? []) $('skill').append(new Option(`${skill.parentId ? '↳ ' : ''}${skill.name}`, skill.id));
  if ([...$('skill').options].some((option) => option.value === selected)) $('skill').value = selected;
  $('timer-form').hidden = !!focus.timer;
  $('active-session').hidden = !focus.timer;
  $('active-skill').textContent = focus.skills?.find((s) => s.id === focus.timer?.skillId)?.name ?? 'Your learning session';
  $('start').disabled = !focus.skills?.length;
  $('sync-status').textContent = focus.syncError ? `Sync needs attention: ${focus.syncError} Completed time will retry automatically.`
    : focus.settings?.appUrl ? 'Connected · Sessions save to this browser’s Growth Board.' : 'Connect Growth Board in Settings to load your skills.';
  $('session-result').textContent = focus.lastResult ?? '';
  $('incognito-status').textContent = focus.incognitoAllowed ? '✓ Incognito protection is enabled.' : '○ Incognito protection is not enabled.';
  const groups = focus.settings?.categories ?? ['social', 'entertainment', 'adult'];
  $('protection').textContent = `◇ Focus protection: ${groups.length ? groups.join(', ') : 'custom list only'}${focus.settings?.customDomains?.length ? ` + ${focus.settings.customDomains.length} custom domains` : ''}`;
  tick();
}
const quotes = [
  '“A little room, a little time, a little further than yesterday.”',
  '“Let your attention follow what you want to become.”',
  '“Small steps count. Especially the ones nobody sees.”',
  '“You don’t need a perfect day to make a little progress.”',
  '“The next chapter begins with the next small step.”',
  '“Give yourself the time you keep giving everything else.”',
  '“Today, choose presence over hurry.”',
];
function renderDashboard() {
  tick();
  const dayIndex = Math.floor(Date.now() / 86400000);
  document.body.dataset.theme = dashboard.theme ?? ['forest', 'dusk', 'ocean'][dayIndex % 3];
  document.body.classList.toggle('photo', !!dashboard.photo);
  document.querySelector('.landscape').style.backgroundImage = dashboard.photo ? `url("${dashboard.photo}")` : '';
  $('quote').textContent = dashboard.quote || quotes[dayIndex % quotes.length];
  const tasks = dashboard.tasks ?? [];
  $('task-count').textContent = `${tasks.filter((t) => t.done).length} / ${tasks.length} done`;
  $('tasks').replaceChildren();
  for (const task of tasks) {
    const li = document.createElement('li');
    li.classList.toggle('completed', task.done);
    const check = document.createElement('input');
    check.type = 'checkbox'; check.checked = task.done;
    check.setAttribute('aria-label', `Complete ${task.text}`);
    check.addEventListener('change', () => { void edit((d) => {
      d.tasks = (d.tasks ?? []).map((t) => t.id === task.id ? { ...t, done: check.checked } : t);
    }).then(renderDashboard).catch((e) => toast(e.message)); });
    const label = document.createElement('span'); label.textContent = task.text;
    const remove = document.createElement('button'); remove.textContent = '×';
    remove.setAttribute('aria-label', `Delete ${task.text}`);
    remove.addEventListener('click', () => { void edit((d) => { d.tasks = d.tasks.filter((t) => t.id !== task.id); }).then(renderDashboard).catch((e) => toast(e.message)); });
    li.append(check, label, remove); $('tasks').append(li);
  }
  $('links').replaceChildren();
  if (focus.settings?.appUrl) {
    const board = document.createElement('a'); board.href = focus.settings.appUrl; board.textContent = '↗ Growth Board'; $('links').append(board);
  }
  for (const link of dashboard.links ?? []) {
    const wrap = document.createElement('span');
    const a = document.createElement('a'); a.href = link.url; a.textContent = link.name;
    const remove = document.createElement('button'); remove.textContent = '×'; remove.setAttribute('aria-label', `Remove ${link.name}`);
    remove.addEventListener('click', () => { void edit((d) => { d.links = d.links.filter((l) => l.id !== link.id); }).then(renderDashboard).catch((e) => toast(e.message)); });
    wrap.append(a, remove); $('links').append(wrap);
  }
  if (document.activeElement !== $('notes')) $('notes').value = dashboard.notes ?? '';
}
action('settings-open', 'click', async () => {
  await request('get');
  $('app-url').value = focus.settings?.appUrl ?? 'http://localhost:3000';
  $('custom-domains').value = (focus.settings?.customDomains ?? []).join('\n');
  for (const check of document.querySelectorAll('[name=category]')) check.checked = (focus.settings?.categories ?? ['social', 'entertainment', 'adult']).includes(check.value);
  $('name').value = dashboard.name ?? '';
  $('custom-quote').value = dashboard.quote ?? '';
  $('theme').value = dashboard.theme ?? document.body.dataset.theme;
  $('sound-scene').value = dashboard.soundScene ?? 'rain';
  $('format24').checked = !!dashboard.format24;
  $('settings').showModal();
});
// Permissions must be requested directly inside the submit user gesture.
action('connect-form', 'submit', async () => {
  const appUrl = appAddress($('app-url').value);
  const granted = await chrome.permissions.request({ origins: [`${new URL(appUrl).origin}/*`] });
  if (!granted) throw new Error('App access was not granted. Your current connection is unchanged.');
  await request('connect', { appUrl }); renderDashboard();
  if (focus.syncError) throw new Error(focus.syncError);
  toast('Growth Board connected. Your skills are ready.');
});
action('sync', 'click', async () => { await request('sync'); renderDashboard(); if (focus.syncError) throw new Error(focus.syncError); toast('Board synced.'); });
action('timer-form', 'submit', async () => {
  await request('start', { skillId: $('skill').value, minutes: Number($('minutes').value), notes: $('session-notes').value });
  toast('Your focus session has started. Distractions are blocked.');
});
action('cancel', 'click', async () => {
  if (confirm('Cancel this session? No practice time will be saved.')) await request('cancel');
});
action('block-form', 'submit', async () => {
  await request('settings', { categories: [...document.querySelectorAll('[name=category]:checked')].map((el) => el.value),
    customDomains: $('custom-domains').value.split(/[\n,]+/).map((d) => d.trim()).filter(Boolean) });
  toast('Blocking preferences saved.');
});
action('personal-form', 'submit', async () => {
  await edit((d) => Object.assign(d, { name: $('name').value.trim(), quote: $('custom-quote').value.trim(), theme: $('theme').value,
    soundScene: $('sound-scene').value, format24: $('format24').checked }));
  renderDashboard(); toast('Your dashboard is saved.');
});
action('intention-form', 'submit', async () => {
  await edit((d) => { d.intention = { day: day(), text: $('intention').value.trim(), done: false }; });
  toast('A little intention for today.');
});
action('intention-done', 'change', async () => {
  await edit((d) => { d.intention = { day: day(), text: $('intention').value.trim(), done: $('intention-done').checked }; });
});
action('task-form', 'submit', async () => {
  const text = $('task-input').value.trim(); if (!text) return;
  await edit((d) => {
    if ((d.tasks?.length ?? 0) >= 200) throw new Error('Clear some tasks before adding more.');
    d.tasks = [...(d.tasks ?? []), { id: crypto.randomUUID(), text, done: false }];
  });
  $('task-input').value = ''; renderDashboard();
});
action('notes', 'change', async () => { const notes = $('notes').value; await edit((d) => { d.notes = notes; }); });
action('event-form', 'submit', async () => {
  await edit((d) => { d.event = { name: $('event-name').value.trim(), date: $('event-date').value }; }); renderDashboard();
});
action('event-clear', 'click', async () => { await edit((d) => { delete d.event; }); renderDashboard(); });
action('link-form', 'submit', async () => {
  const url = new URL($('link-url').value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Use an HTTP or HTTPS link without embedded credentials.');
  await edit((d) => {
    if ((d.links?.length ?? 0) >= 50) throw new Error('Use up to 50 quick links.');
    d.links = [...(d.links ?? []), { id: crypto.randomUUID(), name: $('link-name').value.trim(), url: url.href }];
  });
  $('link-form').reset(); renderDashboard();
});
action('search-form', 'submit', async () => { location.href = `https://www.google.com/search?q=${encodeURIComponent($('search').value)}`; });
action('zen', 'click', async () => { document.body.classList.toggle('zen'); $('zen').textContent = document.body.classList.contains('zen') ? 'Full dashboard' : 'Focus view'; });
action('next-scene', 'click', async () => {
  const themes = ['forest', 'dusk', 'ocean'];
  await edit((d) => { d.theme = themes[(themes.indexOf(document.body.dataset.theme) + 1) % 3]; }); renderDashboard();
});
action('photo', 'change', async () => {
  const file = $('photo').files[0]; if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) throw new Error('Choose a JPG, PNG or WebP photo under 3 MB.');
  const photo = await new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Could not load this photo.')); reader.readAsDataURL(file);
  });
  await edit((d) => { d.photo = photo; }); renderDashboard();
});
action('clear-photo', 'click', async () => { await edit((d) => { delete d.photo; }); renderDashboard(); });

let audio;
action('sound', 'click', async () => {
  if (audio) { await audio.close(); audio = null; $('sound').textContent = '♫ Ambient sound: off'; return; }
  const context = new AudioContext();
  const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) { last = (last + Math.random() * .04 - .02) / 1.02; data[i] = last * 3.5; }
  const source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
  const filter = context.createBiquadFilter(); filter.type = 'lowpass';
  filter.frequency.value = { rain: 1800, wind: 500, stream: 3000 }[dashboard.soundScene ?? 'rain'];
  const gain = context.createGain(); gain.gain.value = .35;
  source.connect(filter).connect(gain).connect(context.destination); source.start();
  await context.resume(); audio = context; $('sound').textContent = `♫ ${dashboard.soundScene ?? 'rain'} · click to stop`;
});
const weatherLabel = (code) => code === 0 ? 'Clear skies' : code <= 3 ? 'Cloudy' : code <= 48 ? 'Misty' : code <= 67 ? 'Rain' : code <= 77 ? 'Snow' : code <= 82 ? 'Showers' : code <= 86 ? 'Snow showers' : 'Thunderstorms';
async function weather(city) {
  $('weather').textContent = 'Looking outside…';
  const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`, { signal: AbortSignal.timeout(10000) });
  if (!geoResponse.ok) throw new Error('Weather location service unavailable.');
  const place = (await geoResponse.json()).results?.[0];
  if (!place) throw new Error('City not found. Try a nearby city.');
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Weather forecast unavailable.');
  const forecast = await response.json();
  const result = { city, name: place.name, current: forecast.current, daily: forecast.daily, at: Date.now() };
  await edit((d) => { d.weather = result; }); renderWeather(result);
}
function renderWeather(result) {
  if (!result) return;
  $('city').value = result.city;
  $('weather').textContent = `${Math.round(result.current.temperature_2m)}°C · ${result.name}`;
  $('forecast').textContent = `${weatherLabel(result.current.weather_code)} · ${result.daily.time.map((date, i) => `${new Date(`${date}T12:00:00`).toLocaleDateString([], { weekday: 'short' })} ${Math.round(result.daily.temperature_2m_max[i])}°/${Math.round(result.daily.temperature_2m_min[i])}°`).join(' · ')} · Open-Meteo`;
}
action('weather-form', 'submit', async () => { try { await weather($('city').value.trim()); } catch (error) { $('weather').textContent = 'Weather unavailable'; throw error; } });

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.dashboard) { dashboard = changes.dashboard.newValue ?? {}; renderDashboard(); }
  if (changes.focus) { focus = { ...focus, ...changes.focus.newValue }; renderFocus(); renderDashboard(); }
});
try {
  dashboard = (await chrome.storage.local.get('dashboard')).dashboard ?? {};
  await request('get'); renderDashboard(); renderWeather(dashboard.weather);
  if (dashboard.weather?.city && Date.now() - dashboard.weather.at > 30 * 60000) {
    void weather(dashboard.weather.city).catch(() => { $('forecast').textContent += ' · Cached forecast (offline)'; });
  }
  // Opening a dashboard refreshes skill changes and timers started in the app.
  if (focus.settings?.appUrl) void request('sync').catch((e) => toast(e.message));
} catch (error) { toast(error.message); renderDashboard(); }
setInterval(tick, 1000);
setInterval(() => { void request('get').catch((e) => toast(e.message)); }, 10000);
