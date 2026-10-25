export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) {
        this.enabled = false;
        return;
      }
      this.ctx = new AudioCtor();
    }
  }

  beep(freq = 220, duration = 0.08, type = 'sine', gainValue = 0.02) {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    gain.gain.value = gainValue;
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
  }
}
