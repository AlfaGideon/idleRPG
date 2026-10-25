type SoundName = 'tap' | 'crit' | 'kill' | 'coin' | 'buy' | 'boss' | 'skill' | 'prestige' | 'achievement';

class Sfx {
  private ctx: AudioContext | null = null;
  enabled = true;
  private lastTap = 0;

  private context(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, duration: number, type: OscillatorType, volume: number, slide = 1, delay = 0): void {
    const ctx = this.context();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide !== 1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + duration);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  private noise(duration: number, volume: number, filterFreq: number): void {
    const ctx = this.context();
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
  }

  play(name: SoundName): void {
    if (!this.enabled) return;
    switch (name) {
      case 'tap': {
        const now = performance.now();
        if (now - this.lastTap < 55) return;
        this.lastTap = now;
        this.noise(0.07, 0.055, 1400);
        this.tone(190, 0.07, 'triangle', 0.045, 0.6);
        break;
      }
      case 'crit':
        this.noise(0.13, 0.09, 2600);
        this.tone(520, 0.16, 'square', 0.055, 1.7);
        this.tone(780, 0.12, 'triangle', 0.04, 1.3, 0.04);
        break;
      case 'kill':
        this.tone(440, 0.1, 'triangle', 0.045, 1.5);
        this.tone(660, 0.12, 'triangle', 0.035, 1.2, 0.05);
        break;
      case 'coin':
        this.tone(880, 0.08, 'square', 0.025, 1.1);
        this.tone(1320, 0.09, 'square', 0.02, 1.1, 0.05);
        break;
      case 'buy':
        this.tone(392, 0.1, 'triangle', 0.05, 1.2);
        this.tone(587, 0.14, 'triangle', 0.045, 1.2, 0.07);
        break;
      case 'boss':
        this.tone(110, 0.5, 'sawtooth', 0.06, 0.75);
        this.tone(165, 0.45, 'triangle', 0.04, 0.8, 0.06);
        this.noise(0.3, 0.05, 600);
        break;
      case 'skill':
        this.tone(220, 0.28, 'sawtooth', 0.05, 2.4);
        this.tone(660, 0.25, 'triangle', 0.04, 1.6, 0.05);
        break;
      case 'prestige':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.05, 1.02, i * 0.09));
        break;
      case 'achievement':
        [659, 880].forEach((f, i) => this.tone(f, 0.2, 'square', 0.03, 1.01, i * 0.1));
        break;
    }
  }
}

export const sfx = new Sfx();
