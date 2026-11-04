import { clamp, lerp, rand } from "./utils.js";

export class Soundscape {
  constructor() {
    this.context = null;
    this.ready = false;
    this.muted = false;
    this.paused = false;
    this.master = null;
    this.sfx = null;
    this.ambient = null;
    this.noiseBuffer = null;
    this.pulseClock = 2.4;
    this.growlClock = 3.2;
    this.thunderClock = 15;
    this.threat = 0;
  }

  init() {
    if (this.context) {
      this.resume();
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    this.context = context;

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 16;
    compressor.ratio.value = 7;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.22;
    compressor.connect(context.destination);

    this.master = context.createGain();
    this.master.gain.value = 0.62;
    this.master.connect(compressor);

    this.sfx = context.createGain();
    this.sfx.gain.value = 0.9;
    this.sfx.connect(this.master);

    this.ambient = context.createGain();
    this.ambient.gain.value = 0.8;
    this.ambient.connect(this.master);

    this.noiseBuffer = this.createNoiseBuffer(2.5);
    this.buildAmbience();
    this.ready = true;
    this.resume();
  }

  createNoiseBuffer(seconds) {
    const context = this.context;
    const length = Math.floor(context.sampleRate * seconds);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.94 + white * 0.06;
      data[i] = white * 0.72 + last * 1.2;
    }
    return buffer;
  }

  buildAmbience() {
    const context = this.context;

    const rainSource = context.createBufferSource();
    rainSource.buffer = this.noiseBuffer;
    rainSource.loop = true;
    const rainHigh = context.createBiquadFilter();
    rainHigh.type = "highpass";
    rainHigh.frequency.value = 580;
    const rainLow = context.createBiquadFilter();
    rainLow.type = "lowpass";
    rainLow.frequency.value = 2800;
    this.rainGain = context.createGain();
    this.rainGain.gain.value = 0.065;
    rainSource.connect(rainHigh).connect(rainLow).connect(this.rainGain).connect(this.ambient);
    rainSource.start();

    const windSource = context.createBufferSource();
    windSource.buffer = this.noiseBuffer;
    windSource.loop = true;
    windSource.playbackRate.value = 0.42;
    const windFilter = context.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 340;
    windFilter.Q.value = 1.5;
    this.windGain = context.createGain();
    this.windGain.gain.value = 0.05;
    windSource.connect(windFilter).connect(this.windGain).connect(this.ambient);
    windSource.start();

    const windLfo = context.createOscillator();
    windLfo.frequency.value = 0.07;
    const windLfoGain = context.createGain();
    windLfoGain.gain.value = 0.024;
    windLfo.connect(windLfoGain).connect(this.windGain.gain);
    windLfo.start();

    const droneFilter = context.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 150;
    droneFilter.Q.value = 2.5;
    this.droneGain = context.createGain();
    this.droneGain.gain.value = 0.014;
    this.droneGain.connect(this.ambient);
    droneFilter.connect(this.droneGain);

    this.droneOscillators = [];
    for (const [frequency, type, detune] of [
      [41.2, "sawtooth", -7],
      [55.1, "triangle", 4],
      [82.4, "sine", 0],
    ]) {
      const oscillator = context.createOscillator();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      oscillator.detune.value = detune;
      oscillator.connect(droneFilter);
      oscillator.start();
      this.droneOscillators.push(oscillator);
    }

    const droneLfo = context.createOscillator();
    droneLfo.frequency.value = 0.045;
    const droneLfoGain = context.createGain();
    droneLfoGain.gain.value = 0.007;
    droneLfo.connect(droneLfoGain).connect(this.droneGain.gain);
    droneLfo.start();
  }

  resume() {
    if (!this.context) return;
    if (this.context.state === "suspended") {
      this.context.resume().catch(() => {});
    }
  }

  setPaused(paused) {
    this.paused = paused;
    if (!this.context || !this.master) return;
    const target = paused ? 0.16 : this.muted ? 0 : 0.62;
    this.master.gain.setTargetAtTime(target, this.context.currentTime, 0.08);
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.context || !this.master) return;
    const target = muted ? 0 : this.paused ? 0.16 : 0.62;
    this.master.gain.setTargetAtTime(target, this.context.currentTime, 0.05);
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setThreat(threat) {
    this.threat = clamp(threat, 0, 1);
    if (!this.ready) return;
    const now = this.context.currentTime;
    this.droneGain.gain.setTargetAtTime(0.013 + this.threat * 0.03, now, 0.7);
    this.windGain.gain.setTargetAtTime(0.045 + this.threat * 0.028, now, 0.8);
    this.rainGain.gain.setTargetAtTime(0.06 + this.threat * 0.01, now, 0.8);
  }

  update(dt, threat = 0, lowHealth = false) {
    if (!this.ready || this.paused) return;

    this.pulseClock -= dt;
    if (this.pulseClock <= 0) {
      this.pulseClock = lowHealth ? lerp(0.95, 0.62, threat) : lerp(2.9, 0.9, threat);
      this.pulse(lowHealth ? 0.14 : 0.035 + threat * 0.075, lowHealth);
    }

    this.growlClock -= dt;
    if (this.growlClock <= 0) {
      this.growlClock = rand(2.5, 7.5) * lerp(1.2, 0.45, threat);
      this.zombieGrowl(rand(-0.8, 0.8), rand(0.05, 0.16) + threat * 0.12, rand(0.75, 1.25));
    }

    this.thunderClock -= dt;
    if (this.thunderClock <= 0) {
      this.thunderClock = rand(22, 48);
      this.thunder();
    }
  }

  pulse(volume = 0.08, doubleBeat = false) {
    if (!this.ready) return;
    const when = this.context.currentTime;
    this.tone({
      frequency: 48,
      endFrequency: 31,
      duration: 0.24,
      volume,
      type: "sine",
      when,
      attack: 0.008,
      destination: this.ambient,
    });
    this.noiseBurst(0.16, {
      volume: volume * 0.42,
      filter: "lowpass",
      frequency: 130,
      when,
      destination: this.ambient,
    });
    if (doubleBeat) {
      this.tone({
        frequency: 42,
        endFrequency: 28,
        duration: 0.2,
        volume: volume * 0.64,
        type: "sine",
        when: when + 0.22,
        attack: 0.006,
        destination: this.ambient,
      });
    }
  }

  shot(kind = "rifle") {
    if (!this.ready) return;
    const when = this.context.currentTime;
    const pan = rand(-0.04, 0.04);

    if (kind === "shotgun") {
      this.noiseBurst(0.32, {
        volume: 0.62,
        filter: "lowpass",
        frequency: 1900,
        Q: 0.7,
        pan,
        when,
        attack: 0.001,
      });
      this.noiseBurst(0.1, {
        volume: 0.24,
        filter: "bandpass",
        frequency: 900,
        Q: 0.5,
        pan,
        when,
        attack: 0.001,
      });
      this.tone({
        frequency: 92,
        endFrequency: 34,
        duration: 0.24,
        volume: 0.42,
        type: "triangle",
        pan,
        when,
        attack: 0.002,
      });
      return;
    }

    if (kind === "pistol") {
      this.noiseBurst(0.085, {
        volume: 0.35,
        filter: "bandpass",
        frequency: 2600,
        Q: 0.65,
        pan,
        when,
      });
      this.tone({
        frequency: 150,
        endFrequency: 62,
        duration: 0.09,
        volume: 0.2,
        type: "square",
        pan,
        when,
        attack: 0.001,
      });
      return;
    }

    this.noiseBurst(0.13, {
      volume: 0.5,
      filter: "bandpass",
      frequency: 1850,
      Q: 0.45,
      pan,
      when,
      attack: 0.001,
    });
    this.noiseBurst(0.045, {
      volume: 0.22,
      filter: "highpass",
      frequency: 3400,
      Q: 0.4,
      pan,
      when,
    });
    this.tone({
      frequency: 118,
      endFrequency: 44,
      duration: 0.12,
      volume: 0.27,
      type: "square",
      pan,
      when,
      attack: 0.001,
    });
  }

  allyShot(pan = 0, shotgun = false) {
    if (!this.ready) return;
    const when = this.context.currentTime;
    this.noiseBurst(shotgun ? 0.16 : 0.075, {
      volume: shotgun ? 0.2 : 0.12,
      filter: "bandpass",
      frequency: shotgun ? 1250 : 2100,
      Q: 0.5,
      pan,
      when,
      attack: 0.001,
    });
    this.tone({
      frequency: shotgun ? 100 : 140,
      endFrequency: 48,
      duration: shotgun ? 0.16 : 0.08,
      volume: 0.08,
      type: "triangle",
      pan,
      when,
      attack: 0.001,
    });
  }

  dryFire() {
    if (!this.ready) return;
    this.noiseBurst(0.035, {
      volume: 0.13,
      filter: "highpass",
      frequency: 2600,
      Q: 0.4,
    });
    this.tone({ frequency: 1100, endFrequency: 700, duration: 0.03, volume: 0.035, type: "square" });
  }

  reload(duration = 1.8) {
    if (!this.ready) return;
    const when = this.context.currentTime;
    this.click(when + 0.08, 0.06);
    this.click(when + Math.min(duration * 0.55, duration - 0.1), 0.08);
    if (duration > 1.7) this.click(when + duration * 0.82, 0.05);
  }

  click(when, volume = 0.05, frequency = 1650) {
    if (!this.ready) return;
    this.noiseBurst(0.035, {
      volume,
      filter: "bandpass",
      frequency,
      Q: 2,
      when,
      attack: 0.001,
    });
    this.tone({
      frequency: frequency * 0.52,
      endFrequency: frequency * 0.36,
      duration: 0.035,
      volume: volume * 0.3,
      type: "square",
      when,
      attack: 0.001,
    });
  }

  switchWeapon() {
    if (!this.ready) return;
    const when = this.context.currentTime;
    this.click(when, 0.055, 1100);
    this.click(when + 0.11, 0.045, 1460);
  }

  shove() {
    if (!this.ready) return;
    const when = this.context.currentTime;
    this.noiseBurst(0.18, {
      volume: 0.2,
      filter: "bandpass",
      frequency: 720,
      endFrequency: 230,
      Q: 1.2,
      when,
      attack: 0.02,
    });
    this.tone({
      frequency: 120,
      endFrequency: 55,
      duration: 0.16,
      volume: 0.09,
      type: "sine",
      when,
      attack: 0.01,
    });
  }

  hit(headshot = false) {
    if (!this.ready) return;
    const when = this.context.currentTime;
    this.tone({
      frequency: headshot ? 1500 : 940,
      endFrequency: headshot ? 1100 : 700,
      duration: 0.045,
      volume: headshot ? 0.055 : 0.035,
      type: "square",
      when,
      attack: 0.001,
    });
    if (headshot) {
      this.tone({
        frequency: 2100,
        endFrequency: 1700,
        duration: 0.07,
        volume: 0.03,
        type: "sine",
        when: when + 0.02,
      });
    }
  }

  kill() {
    if (!this.ready) return;
    const when = this.context.currentTime;
    this.tone({
      frequency: 380,
      endFrequency: 110,
      duration: 0.12,
      volume: 0.04,
      type: "triangle",
      when,
    });
    this.noiseBurst(0.12, {
      volume: 0.11,
      filter: "lowpass",
      frequency: 680,
      when,
      destination: this.sfx,
    });
  }

  hurt() {
    if (!this.ready) return;
    const when = this.context.currentTime;
    this.noiseBurst(0.19, {
      volume: 0.22,
      filter: "lowpass",
      frequency: 900,
      Q: 0.8,
      when,
      attack: 0.001,
    });
    this.tone({
      frequency: 76,
      endFrequency: 42,
      duration: 0.2,
      volume: 0.18,
      type: "sawtooth",
      when,
    });
  }

  zombieAttack(pan = 0) {
    if (!this.ready) return;
    const when = this.context.currentTime;
    this.noiseBurst(0.16, {
      volume: 0.12,
      filter: "bandpass",
      frequency: 600,
      Q: 0.7,
      pan,
      when,
      attack: 0.01,
    });
    this.tone({
      frequency: rand(88, 130),
      endFrequency: rand(50, 75),
      duration: 0.18,
      volume: 0.045,
      type: "sawtooth",
      pan,
      when,
    });
  }

  zombieGrowl(pan = 0, volume = 0.1, pitch = 1) {
    if (!this.ready) return;
    const when = this.context.currentTime;
    const duration = rand(0.45, 1.15);
    this.tone({
      frequency: rand(54, 86) * pitch,
      endFrequency: rand(38, 56) * pitch,
      duration,
      volume,
      type: "sawtooth",
      pan,
      when,
      attack: 0.08,
      filterFrequency: rand(300, 650),
      destination: this.ambient,
    });
    this.noiseBurst(duration * 0.7, {
      volume: volume * 0.32,
      filter: "bandpass",
      frequency: rand(260, 630),
      Q: 1.4,
      pan,
      when: when + 0.04,
      attack: 0.06,
      destination: this.ambient,
    });
  }

  zombieDie(pan = 0) {
    if (!this.ready) return;
    const when = this.context.currentTime;
    this.tone({
      frequency: rand(105, 155),
      endFrequency: rand(35, 58),
      duration: 0.42,
      volume: 0.055,
      type: "sawtooth",
      pan,
      when,
      attack: 0.01,
      filterFrequency: 500,
    });
    this.noiseBurst(0.24, {
      volume: 0.08,
      filter: "lowpass",
      frequency: 420,
      pan,
      when,
      attack: 0.01,
    });
  }

  spit(pan = 0) {
    if (!this.ready) return;
    const when = this.context.currentTime;
    this.noiseBurst(0.26, {
      volume: 0.16,
      filter: "bandpass",
      frequency: 900,
      endFrequency: 260,
      Q: 2.4,
      pan,
      when,
      attack: 0.02,
    });
  }

  explosion(pan = 0) {
    if (!this.ready) return;
    const when = this.context.currentTime;
    this.noiseBurst(0.8, {
      volume: 0.68,
      filter: "lowpass",
      frequency: 900,
      Q: 0.8,
      pan,
      when,
      attack: 0.002,
    });
    this.tone({
      frequency: 82,
      endFrequency: 24,
      duration: 0.7,
      volume: 0.5,
      type: "sine",
      pan,
      when,
      attack: 0.002,
    });
    this.noiseBurst(0.45, {
      volume: 0.25,
      filter: "highpass",
      frequency: 2200,
      Q: 0.5,
      pan,
      when: when + 0.03,
      attack: 0.005,
    });
  }

  pickup() {
    if (!this.ready) return;
    const when = this.context.currentTime;
    this.tone({ frequency: 430, endFrequency: 620, duration: 0.09, volume: 0.05, type: "sine", when });
    this.tone({ frequency: 620, endFrequency: 780, duration: 0.14, volume: 0.04, type: "sine", when: when + 0.07 });
  }

  heal() {
    if (!this.ready) return;
    const when = this.context.currentTime;
    this.noiseBurst(0.5, {
      volume: 0.055,
      filter: "bandpass",
      frequency: 1100,
      endFrequency: 2300,
      Q: 1.6,
      when,
      attack: 0.08,
    });
    this.tone({ frequency: 330, endFrequency: 440, duration: 0.4, volume: 0.03, type: "sine", when });
  }

  gate() {
    if (!this.ready) return;
    const when = this.context.currentTime;
    this.tone({
      frequency: 65,
      endFrequency: 40,
      duration: 1.3,
      volume: 0.18,
      type: "sawtooth",
      when,
      attack: 0.05,
      filterFrequency: 280,
    });
    for (let i = 0; i < 5; i += 1) {
      this.click(when + 0.18 + i * 0.17, 0.075, rand(820, 1300));
    }
    this.noiseBurst(0.8, {
      volume: 0.13,
      filter: "bandpass",
      frequency: 340,
      Q: 1.4,
      when: when + 0.1,
      attack: 0.1,
    });
  }

  horde() {
    if (!this.ready) return;
    const when = this.context.currentTime;
    this.tone({
      frequency: 58,
      endFrequency: 42,
      duration: 1.8,
      volume: 0.19,
      type: "sawtooth",
      when,
      attack: 0.24,
      filterFrequency: 220,
      destination: this.sfx,
    });
    this.noiseBurst(1.8, {
      volume: 0.11,
      filter: "lowpass",
      frequency: 580,
      Q: 0.5,
      when,
      attack: 0.2,
    });
  }

  specialAlert() {
    if (!this.ready) return;
    const when = this.context.currentTime;
    for (let i = 0; i < 2; i += 1) {
      this.tone({
        frequency: 760 - i * 120,
        endFrequency: 440,
        duration: 0.18,
        volume: 0.045,
        type: "square",
        when: when + i * 0.2,
        attack: 0.005,
      });
    }
  }

  finale() {
    if (!this.ready) return;
    const when = this.context.currentTime;
    [0, 0.15, 0.3].forEach((offset, index) => {
      this.tone({
        frequency: 98 + index * 8,
        endFrequency: 62,
        duration: 0.45,
        volume: 0.13,
        type: "sawtooth",
        when: when + offset,
        attack: 0.01,
        filterFrequency: 380,
      });
    });
  }

  victory() {
    if (!this.ready) return;
    const when = this.context.currentTime;
    [220, 277, 330, 440].forEach((frequency, index) => {
      this.tone({
        frequency,
        endFrequency: frequency * 0.99,
        duration: 1.5,
        volume: 0.045,
        type: "sine",
        when: when + index * 0.18,
        attack: 0.12,
        destination: this.ambient,
      });
    });
  }

  thunder() {
    if (!this.ready) return;
    const when = this.context.currentTime;
    this.noiseBurst(2.4, {
      volume: 0.16,
      filter: "lowpass",
      frequency: 240,
      Q: 0.6,
      when,
      attack: 0.14,
      destination: this.ambient,
    });
    this.tone({
      frequency: 52,
      endFrequency: 30,
      duration: 2.2,
      volume: 0.1,
      type: "sine",
      when,
      attack: 0.18,
      destination: this.ambient,
    });
  }

  playerStep(running = false) {
    if (!this.ready) return;
    const when = this.context.currentTime;
    this.noiseBurst(0.055, {
      volume: running ? 0.035 : 0.022,
      filter: "lowpass",
      frequency: rand(350, 520),
      when,
      attack: 0.002,
      destination: this.sfx,
    });
  }

  noiseBurst(duration, options = {}) {
    if (!this.ready) return;
    const {
      volume = 0.1,
      filter = "lowpass",
      frequency = 2000,
      endFrequency = null,
      Q = 1,
      pan = 0,
      when = this.context.currentTime,
      attack = 0.002,
      destination = this.sfx,
    } = options;

    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const maxOffset = Math.max(0, this.noiseBuffer.duration - duration - 0.01);
    source.start(when, rand(0, maxOffset), duration);

    const filterNode = this.context.createBiquadFilter();
    filterNode.type = filter;
    filterNode.frequency.setValueAtTime(Math.max(20, frequency), when);
    filterNode.Q.value = Q;
    if (endFrequency) {
      filterNode.frequency.exponentialRampToValueAtTime(
        Math.max(20, endFrequency),
        when + duration
      );
    }

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(volume, when + Math.min(attack, duration * 0.6));
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

    const panner = this.createPanner(pan);
    source.connect(filterNode);
    filterNode.connect(gain);
    if (panner) {
      gain.connect(panner);
      panner.connect(destination);
    } else {
      gain.connect(destination);
    }

    source.onended = () => {
      source.disconnect();
      filterNode.disconnect();
      gain.disconnect();
      if (panner) panner.disconnect();
    };
  }

  tone(options = {}) {
    if (!this.ready) return;
    const {
      frequency = 440,
      endFrequency = null,
      duration = 0.2,
      volume = 0.05,
      type = "sine",
      pan = 0,
      when = this.context.currentTime,
      attack = 0.005,
      filterFrequency = null,
      destination = this.sfx,
    } = options;

    const oscillator = this.context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), when);
    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(20, endFrequency),
        when + duration
      );
    }

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(volume, when + Math.min(attack, duration * 0.5));
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

    let tail = oscillator;
    if (filterFrequency) {
      const filterNode = this.context.createBiquadFilter();
      filterNode.type = "lowpass";
      filterNode.frequency.value = filterFrequency;
      oscillator.connect(filterNode);
      tail = filterNode;
    }
    tail.connect(gain);

    const panner = this.createPanner(pan);
    if (panner) {
      gain.connect(panner);
      panner.connect(destination);
    } else {
      gain.connect(destination);
    }

    oscillator.start(when);
    oscillator.stop(when + duration + 0.04);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      if (panner) panner.disconnect();
    };
  }

  createPanner(pan = 0) {
    if (!this.context || Math.abs(pan) < 0.001) return null;
    if (typeof this.context.createStereoPanner !== "function") return null;
    const panner = this.context.createStereoPanner();
    panner.pan.value = clamp(pan, -1, 1);
    return panner;
  }
}
