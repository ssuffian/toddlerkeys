import type { PlayKey, Settings } from '../shared/contracts';

const MAX_VOICES = 4;
const MAX_STARTS_PER_SECOND = 8;
const PRESETS = {
  marimba: { waveform: 'triangle', duration: 0.30, attack: 0.008, gain: 0.20, octave: 1 },
  piano: { waveform: 'triangle', duration: 0.46, attack: 0.005, gain: 0.17, octave: 1 },
  bells: { waveform: 'sine', duration: 0.62, attack: 0.003, gain: 0.13, octave: 2 },
  softSynth: { waveform: 'square', duration: 0.22, attack: 0.018, gain: 0.08, octave: 0.5 },
} as const satisfies Record<Settings['instrument'], { waveform: OscillatorType; duration: number; attack: number; gain: number; octave: number }>;
export type Tone = { frequency: number; duration: number; attack: number; gain: number; waveform: OscillatorType };

export class ToneScheduler {
  private starts: number[] = [];
  private ends: number[] = [];
  private stopped = false;
  constructor(private readonly now: () => number = () => performance.now()) {}

  accept(key: PlayKey, settings: Settings): Tone | null {
    const now = this.now();
    this.starts = this.starts.filter(start => now - start < 1000);
    this.ends = this.ends.filter(end => end > now);
    if (this.stopped || key.phase !== 'down' || !settings.sound || settings.volume <= 0 || this.starts.length >= MAX_STARTS_PER_SECOND || this.ends.length >= MAX_VOICES) return null;
    const preset = PRESETS[settings.instrument];
    this.starts.push(now);
    this.ends.push(now + preset.duration * 1000);
    const scale = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];
    return { frequency: scale[key.colorIndex % scale.length] * preset.octave, duration: preset.duration, attack: preset.attack, gain: settings.volume * preset.gain, waveform: preset.waveform };
  }

  start(): void { this.stopped = false; }
  stop(): void { this.stopped = true; this.starts = []; this.ends = []; }
  get activeVoices(): number { const now = this.now(); return this.ends.filter(end => end > now).length; }
}

export interface Sound {
  accept(key: PlayKey): void;
  configure(settings: Settings): void;
  unlock(): Promise<void>;
  stop(): void;
  dispose(): void;
}

export function createSound(): Sound {
  let context: AudioContext | undefined;
  let settings: Settings = { sound: true, volume: 0.15, instrument: 'marimba', reducedMotion: false, lockdownMode: false, showExitHint: false };
  let scheduler = new ToneScheduler();
  const voices = new Set<OscillatorNode>();

  const ensureContext = () => {
    if (!context) context = new AudioContext({ latencyHint: 'interactive' });
    return context;
  };
  const stopVoices = () => {
    for (const voice of voices) { try { voice.stop(); } catch { /* already stopped */ } }
    voices.clear();
  };

  return {
    async unlock() {
      if (!settings.sound) return;
      scheduler.start();
      try {
        const audio = ensureContext();
        if (audio.state === 'suspended') await audio.resume();
      } catch { /* sound remains optional */ }
    },
    accept(key) {
      try {
        const audio = ensureContext();
        // A suspended context freezes its clock. Discard input until it resumes
        // instead of queuing a burst for later playback.
        if (audio.state !== 'running' || voices.size >= MAX_VOICES) return;
        const tone = scheduler.accept(key, settings);
        if (!tone) return;
        const start = audio.currentTime;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = tone.waveform;
        oscillator.frequency.setValueAtTime(tone.frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, tone.gain), start + tone.attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
        oscillator.connect(gain).connect(audio.destination);
        voices.add(oscillator);
        oscillator.addEventListener('ended', () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); }, { once: true });
        oscillator.start(start);
        oscillator.stop(start + tone.duration);
      } catch { /* unsupported or unavailable audio continues silently */ }
    },
    configure(next) { settings = { ...next }; if (!settings.sound || settings.volume <= 0) stopVoices(); },
    stop() { scheduler.stop(); stopVoices(); },
    dispose() { scheduler.stop(); stopVoices(); if (context) void context.close(); context = undefined; },
  };
}
