// Reuse the context unlocked by the Start timer click for the completion chime.
let audio: AudioContext | null = null;
export function playSessionAlert(kind: "start" | "finish") {
  try {
    audio ??= new AudioContext();
    const context = audio;
    void context.resume().then(() => {
      const notes = kind === "start" ? [523.25, 659.25] : [523.25, 659.25, 783.99];
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
