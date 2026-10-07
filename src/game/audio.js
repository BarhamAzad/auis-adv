// Original synthesized music. A single gain node is connected once per context.
export function createAudio() {
  let context, volume, timer, enabled = false, index = 0, request = 0;
  const voices = new Set(), rewardTimers = new Set();
  const notes = [293.66, 369.99, 440, 587.33, 493.88, 440, 369.99, 329.63, 293.66, 440, 587.33, 659.25, 587.33, 493.88, 440, 369.99];

  function stop() {
    clearInterval(timer); timer = null;
    for (const pending of rewardTimers) clearTimeout(pending);
    rewardTimers.clear();
    if (volume && context?.state !== 'closed') {
      volume.gain.cancelScheduledValues(context.currentTime);
      volume.gain.setValueAtTime(0, context.currentTime);
    }
    for (const voice of voices) {
      try { voice.stop(); } catch { /* A completed voice is already stopped. */ }
    }
    voices.clear();
  }

  function tone(frequency, duration = 1.4, gain = .03) {
    if (!enabled || context?.state !== 'running') return;
    const oscillator = context.createOscillator(), envelope = context.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(0, context.currentTime);
    envelope.gain.linearRampToValueAtTime(gain, context.currentTime + .1);
    envelope.gain.exponentialRampToValueAtTime(.0001, context.currentTime + duration);
    oscillator.connect(envelope).connect(volume); voices.add(oscillator);
    oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(); oscillator.stop(context.currentTime + duration);
  }

  return {
    async setEnabled(value) {
      const current = ++request;
      enabled = Boolean(value);
      if (!enabled) { stop(); return true; }
      try {
        if (!context || context.state === 'closed') {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!AudioContext) { enabled = false; return false; }
          context = new AudioContext(); volume = context.createGain();
          volume.gain.value = 0; volume.connect(context.destination);
        }
        await context.resume();
        if (current !== request || !enabled) return true;
        if (context.state !== 'running') { enabled = false; stop(); return false; }
        volume.gain.setValueAtTime(.6, context.currentTime);
        if (!timer) {
          tone(notes[index++ % notes.length]);
          timer = setInterval(() => {
            tone(notes[index++ % notes.length]);
            if (index % 4 === 0) tone(146.83, 2.6, .022);
          }, 620);
        }
        return true;
      } catch {
        if (current === request) { enabled = false; stop(); }
        return false;
      }
    },
    reward() {
      if (!enabled) return;
      [293.66, 369.99, 440, 587.33].forEach((note, i) => {
        const pending = setTimeout(() => { rewardTimers.delete(pending); tone(note, 1, .08); }, i * 110);
        rewardTimers.add(pending);
      });
    },
    dispose() { request++; enabled = false; stop(); context?.close(); },
    get enabled() { return enabled; },
  };
}
