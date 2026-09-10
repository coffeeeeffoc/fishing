import type { Sound } from './engine.ts';
const NOTES: Record<Sound, [number, number, OscillatorType]> = {
  fire: [230, 0.055, 'triangle'],
  hit: [510, 0.04, 'sine'],
  kill: [790, 0.11, 'sine'],
  coin: [1260, 0.08, 'sine'],
  combo: [990, 0.27, 'triangle'],
  weapon: [440, 0.14, 'sine'],
  boss: [85, 0.6, 'sawtooth'],
  warning: [170, 0.32, 'triangle'],
  event: [660, 0.3, 'sine'],
};
export class AudioManager {
  private context: AudioContext | null = null;
  private volume: GainNode | null = null;
  private last: Partial<Record<Sound, number>> = {};
  private voices = 0;
  enabled = true;
  unlock() {
    try {
      if (!this.context) {
        const Constructor =
          window.AudioContext ??
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Constructor) return;
        this.context = new Constructor();
        this.volume = this.context.createGain();
        this.volume.gain.value = this.enabled ? 0.14 : 0;
        this.volume.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    } catch {
      /* Unsupported audio remains silent; gameplay is independent. */
    }
  }
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.context && this.volume)
      this.volume.gain.setTargetAtTime(enabled ? 0.14 : 0, this.context.currentTime, 0.025);
  }
  play(sound: Sound) {
    const c = this.context;
    if (!this.enabled || !c || c.state !== 'running' || !this.volume || this.voices >= 12) return;
    const now = c.currentTime;
    if (
      now - (this.last[sound] ?? -1) <
      (sound === 'fire' ? 0.095 : sound === 'hit' ? 0.065 : 0.09)
    )
      return;
    this.last[sound] = now;
    const [frequency, duration, type] = NOTES[sound];
    const oscillator = c.createOscillator(),
      gain = c.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      frequency * (sound === 'fire' ? 0.4 : 1.6),
      now + duration,
    );
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(sound === 'boss' ? 0.35 : 0.5, now + 0.009);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.volume);
    this.voices++;
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      if (this.context === c) this.voices--;
    };
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
  }
  suspend() {
    if (this.context?.state === 'running') void this.context.suspend().catch(() => {});
  }
  dispose() {
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
    this.volume = null;
    this.last = {};
    this.voices = 0;
  }
}
