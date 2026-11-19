// Reuse the context unlocked by the Start timer click for the completion chime.
let audio: AudioContext | null = null;
export function unlockSessionAudio() {
  try { audio ??= new AudioContext(); void audio.resume().catch(() => {}); } catch { /* Audio remains optional. */ }
}
export function playSessionAlert(kind: "start" | "break" | "resume" | "finish") {
  try {
    audio ??= new AudioContext();
    const context = audio;
    void context.resume().then(() => {
      const notes = { start: [523.25, 659.25], break: [659.25, 523.25, 392], resume: [392, 523.25, 659.25], finish: [523.25, 659.25, 783.99, 1046.5] }[kind];
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + index * 0.18;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.1, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.32);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    }).catch(() => { /* The visible alert remains available if audio is blocked. */ });
  } catch {
    // Audio is optional; it must never interrupt starting or saving a session.
  }
}
