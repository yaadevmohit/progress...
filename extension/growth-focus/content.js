// This script has no page-triggered runtime commands. Only the worker can ask
// it to call the four narrowly scoped methods implemented by ExtensionBridge.
if (!globalThis.growthFocusBridgeInstalled) {
  globalThis.growthFocusBridgeInstalled = true;
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id || message?.type !== 'board-command') return;
    const id = crypto.randomUUID();
    const timeout = setTimeout(() => {
      window.removeEventListener('message', receive);
      respond({ error: 'Growth Board did not respond. Update the app, open /growth-board, and retry.' });
    }, 4000);
    function receive(event) {
      if (event.source !== window || event.origin !== location.origin ||
          event.data?.channel !== 'growth-board-extension-response' || event.data.id !== id) return;
      clearTimeout(timeout);
      window.removeEventListener('message', receive);
      respond(event.data);
    }
    window.addEventListener('message', receive);
    window.postMessage({ channel: 'growth-board-extension-request', id,
      command: message.command, payload: message.payload }, location.origin);
    return true;
  });
}
