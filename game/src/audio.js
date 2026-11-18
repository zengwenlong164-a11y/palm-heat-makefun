// Oscillators only: there are no audio files or remote resources.
export function createAudio() {
  let context;
  let master;
  let engine;
  let engineGain;
  let siren;
  let sirenGain;
  let muted = false;
  function unlock() {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = .22;
      master.connect(context.destination);
      engine = context.createOscillator();
      engine.type = 'sawtooth';
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engine.connect(engineGain).connect(master);
      engine.start();
      siren = context.createOscillator();
      sirenGain = context.createGain();
      sirenGain.gain.value = 0;
      siren.connect(sirenGain).connect(master);
      siren.start();
    }
    context.resume();
  }
  function tone(frequency, duration, type = 'sine', volume = .3, end = frequency) {
    if (!context || muted) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const now = context.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), now + duration);
    envelope.gain.setValueAtTime(volume, now);
    envelope.gain.exponentialRampToValueAtTime(.001, now + duration);
    oscillator.connect(envelope).connect(master);
    oscillator.start();
    oscillator.stop(now + duration);
  }
  return {
    unlock,
    get muted() { return muted; },
    mute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : .22;
    },
    gunshot() { tone(160, .13, 'sawtooth', .6, 24); },
    pickup() { tone(520, .2, 'sine', .4, 1040); },
    ui() { tone(330, .1, 'triangle', .3, 660); },
    crash() { tone(75, .18, 'square', .4, 23); },
    update(speed, wanted, time, active) {
      if (!context) return;
      const now = context.currentTime;
      engine.frequency.setTargetAtTime(38 + Math.abs(speed || 0) * .42, now, .08);
      engineGain.gain.setTargetAtTime(active && speed !== null ? .1 + Math.abs(speed) / 1600 : 0, now, .1);
      siren.frequency.setTargetAtTime(650 + Math.sin(time * 7) * 230, now, .03);
      sirenGain.gain.setTargetAtTime(active && wanted ? .045 : 0, now, .1);
    },
  };
}
