// Generated locally with Web Audio; no audio files or external service.
export function createAmbientAudio() {
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = 0;
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -18;
  limiter.ratio.value = 5;
  master.connect(limiter).connect(context.destination);

  function tone(frequency: number, level: number, pan: number) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const stereo = context.createStereoPanner();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.value = level;
    stereo.pan.value = pan;
    oscillator.connect(gain).connect(stereo).connect(master);
    oscillator.start();
    return gain;
  }

  // Slightly different left/right tones create a slow binaural texture.
  tone(110, .13, -1);
  tone(114, .13, 1);
  const pad = tone(55, .14, 0);
  tone(82.41, .045, -.4);
  tone(130.81, .025, .4);
  tone(164.81, .016, 0);

  const drift = context.createOscillator();
  const driftDepth = context.createGain();
  drift.frequency.value = .07;
  driftDepth.gain.value = .025;
  drift.connect(driftDepth).connect(pad.gain);
  drift.start();

  const pulse = context.createOscillator();
  const pulseDepth = context.createGain();
  const beat = tone(41.2, .025, 0);
  pulse.frequency.value = .55;
  pulseDepth.gain.value = .02;
  pulse.connect(pulseDepth).connect(beat.gain);
  pulse.start();

  function ramp(parameter: AudioParam, value: number, seconds: number) {
    parameter.cancelAndHoldAtTime(context.currentTime);
    parameter.linearRampToValueAtTime(value, context.currentTime + seconds);
  }

  const drums = context.createGain();
  drums.gain.value = 0;
  drums.connect(master);
  const noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const noiseSamples = noise.getChannelData(0);
  for (let i = 0; i < noiseSamples.length; i++) noiseSamples[i] = Math.random() * 2 - 1;

  let formActive = false;
  let soundActive = false;
  let scheduler: ReturnType<typeof setInterval> | null = null;
  let nextBeat = 0;
  let step = 0;
  const STEP_SECONDS = 60 / 72 / 2;

  function kick(at: number) {
    const body = context.createOscillator();
    const envelope = context.createGain();
    body.frequency.setValueAtTime(125, at);
    body.frequency.exponentialRampToValueAtTime(42, at + .16);
    envelope.gain.setValueAtTime(.42, at);
    envelope.gain.exponentialRampToValueAtTime(.001, at + .38);
    body.connect(envelope).connect(drums);
    body.onended = () => { body.disconnect(); envelope.disconnect(); };
    body.start(at);
    body.stop(at + .4);
  }

  function percussion(at: number, snare: boolean) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = noise;
    filter.type = snare ? "bandpass" : "highpass";
    filter.frequency.value = snare ? 1600 : 6500;
    filter.Q.value = snare ? .65 : .4;
    envelope.gain.setValueAtTime(snare ? .13 : .024, at);
    envelope.gain.exponentialRampToValueAtTime(.001, at + (snare ? .17 : .045));
    source.connect(filter).connect(envelope).connect(drums);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
    source.start(at);
    source.stop(at + (snare ? .2 : .06));
  }

  function stopDrums() {
    if (scheduler !== null) clearInterval(scheduler);
    scheduler = null;
  }

  function syncDrums() {
    if (!formActive || !soundActive) {
      stopDrums();
      ramp(drums.gain, 0, .4);
      return;
    }
    if (scheduler !== null) return;
    nextBeat = context.currentTime + .06;
    step = 0;
    ramp(drums.gain, .65, 2);
    function schedule() {
      if (context.state === "closed") { stopDrums(); return; }
      // Schedule a short lookahead against the audio clock, avoiding timer jitter.
      if (nextBeat < context.currentTime) nextBeat = context.currentTime + .03;
      while (nextBeat < context.currentTime + .15) {
        if (step === 0 || step === 4) kick(nextBeat);
        if (step === 2 || step === 6) percussion(nextBeat, true);
        percussion(nextBeat, false);
        step = (step + 1) % 8;
        nextBeat += STEP_SECONDS;
      }
    }
    schedule();
    scheduler = setInterval(schedule, 50);
  }

  return {
    context,
    async play(intensify = false, stillWanted = () => true) {
      await context.resume();
      if (!stillWanted()) return;
      soundActive = true;
      syncDrums();
      ramp(master.gain, intensify ? .52 : .34, intensify ? 3.5 : 2);
      ramp(pulse.frequency, intensify ? 1.1 : .55, 3.5);
      ramp(pulseDepth.gain, intensify ? .055 : .02, 3.5);
    },
    reveal(step: number) {
      if (!soundActive || context.state !== "running") return;
      const at = context.currentTime;
      const note = step === 0 ? 523.25 : 659.25;
      for (const [ratio, level] of [[1, .09], [1.5, .025]]) {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = note * ratio;
        envelope.gain.setValueAtTime(0, at);
        envelope.gain.linearRampToValueAtTime(level, at + .08);
        envelope.gain.exponentialRampToValueAtTime(.001, at + .65);
        oscillator.connect(envelope).connect(master);
        oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
        oscillator.start(at);
        oscillator.stop(at + .7);
      }
    },
    mute() {
      soundActive = false;
      syncDrums();
      ramp(master.gain, 0, .7);
    },
    setFormActive(active: boolean) {
      formActive = active;
      syncDrums();
    },
    dispose() {
      stopDrums();
      return context.close();
    },
  };
}
