const chimes = new Map(['start', 'break', 'resume', 'finish'].map((kind) => [kind, new Audio(chrome.runtime.getURL(`sounds/${kind}.wav`))]));
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || message?.type !== 'play-alert' || !chimes.has(message.kind)) return;
  const chime = chimes.get(message.kind);
  chime.currentTime = 0;
  chime.play().then(() => respond({ played: true }), () => respond({ error: 'Timer sound was blocked by the browser.' }));
  return true;
});
