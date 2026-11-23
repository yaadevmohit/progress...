export { currentPhase, timerPhases, validatePomodoro } from "./timer-plan.mjs";
export const GROUPS = {
  social: ['facebook.com', 'instagram.com', 'threads.net', 'threads.com', 'twitter.com', 'x.com', 'tiktok.com', 'reddit.com', 'snapchat.com', 'pinterest.com', 'tumblr.com', 'discord.com', 'bsky.app'],
  entertainment: ['youtube.com', 'youtu.be', 'youtube-nocookie.com', 'twitch.tv', 'netflix.com', 'hulu.com', 'disneyplus.com', 'primevideo.com', 'max.com', 'hbomax.com', 'dailymotion.com', '9gag.com', '9anime.to', 'crunchyroll.com', 'kick.com'],
  adult: ['pornhub.com', 'xvideos.com', 'xnxx.com', 'xhamster.com', 'redtube.com', 'youporn.com', 'tube8.com', 'spankbang.com', 'eporner.com', 'beeg.com', 'porn.com', 'sex.com', 'onlyfans.com', 'fansly.com', 'chaturbate.com', 'stripchat.com', 'bongacams.com', 'livejasmin.com', 'hanime.tv', 'rule34.xxx'],
};
export function appAddress(value) {
  const url = new URL(value);
  if (url.username || url.password || (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) {
    throw new Error('Use an HTTPS app address, or HTTP on localhost.');
  }
  return `${url.origin}/growth-board`;
}
export function domain(value) {
  const input = value.trim().toLowerCase();
  const url = new URL(input.includes('://') ? input : `https://${input}`);
  const host = url.hostname.replace(/^www\./, '');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.port || url.pathname !== '/' || url.search || url.hash ||
      !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)) {
    throw new Error(`Enter a domain only, such as example.com: ${value}`);
  }
  return host;
}
export function blockedDomains(settings = {}) {
  const categories = settings.categories ?? ['social', 'entertainment', 'adult'];
  return [...new Set([
    ...categories.flatMap((key) => GROUPS[key] ?? []),
    ...(settings.customDomains ?? []).map(domain),
  ])];
}
export function matchesDomain(host, domains) {
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}
export function blockingRules(settings, timer, now = Date.now()) {
  if (!timer || timer.endsAt <= now) return [];
  const domains = blockedDomains(settings);
  if (!domains.length) return [];
  // Block embedded media as well as navigation; subdomains match automatically.
  const rules = [{ id: 1, priority: 1, action: { type: 'block' }, condition: {
    requestDomains: domains,
    resourceTypes: ['main_frame', 'sub_frame', 'media', 'xmlhttprequest', 'websocket', 'other'],
  }}];
  // Never block the connected board, even if hosted under a listed domain.
  if (settings.appUrl) rules.push({ id: 2, priority: 2, action: { type: 'allowAllRequests' },
    condition: { requestDomains: [new URL(settings.appUrl).hostname], resourceTypes: ['main_frame', 'sub_frame'] } });
  return rules;
}
export function remaining(timer, now = Date.now()) {
  return timer ? Math.max(0, Math.ceil((timer.endsAt - now) / 1000)) : 0;
}
