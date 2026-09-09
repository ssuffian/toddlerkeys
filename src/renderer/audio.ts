import type { PlayKey, Settings } from '../shared/contracts';

const MAX_VOICES = 4;
const MAX_STARTS_PER_SECOND = 8;
const TONE_SECONDS = 0.27;
export type Tone = { frequency: number; duration: number; gain: number };

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
    this.starts.push(now);
    this.ends.push(now + TONE_SECONDS * 1000);
    const scale = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];
    return { frequency: scale[key.colorIndex % scale.length], duration: TONE_SECONDS, gain: settings.volume };
  }

  start(): void { this.stopped = false; }
  stop(): void { this.stopped = true; this.starts = []; this.ends = []; }
  get activeVoices(): number { const now = this.now(); return this.ends.filter(end => end > now).length; }
}

export interface Sound {
  accept(key: PlayKey): void;
  configure(settings: Settings): void;
  unlock(): void;
  stop(): void;
  dispose(): void;
}

export function createSound(): Sound {
  let context: AudioContext | undefined;
  let settings: Settings = { sound: true, volume: 0.15, reducedMotion: false, lockdownMode: false };
  let scheduler = new ToneScheduler();
  const voices = new Set<OscillatorNode>();

  const ensureContext = () => {
    if (!context) context = new AudioContext({ latencyHint: 'interactive' });
    if (context.state === 'suspended') void context.resume().catch(() => undefined);
    return context;
  };
  const stopVoices = () => {
    for (const voice of voices) { try { voice.stop(); } catch { /* already stopped */ } }
    voices.clear();
  };

  return {
    unlock() { if (settings.sound) { scheduler.start(); try { ensureContext(); } catch { /* sound remains optional */ } } },
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
        oscillator.type = key.category === 'control' ? 'sine' : 'triangle';
        oscillator.frequency.setValueAtTime(tone.frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, tone.gain * 0.18), start + 0.012);
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
