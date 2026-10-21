import { defaultSettings } from '../shared/settings';
import type { PlayKey, Settings, ToddlerKeysBridge } from '../shared/contracts';

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
    if (this.stopped || key.phase !== 'down' || !settings.sound || settings.audioMode !== 'tones' || settings.volume <= 0 || this.starts.length >= MAX_STARTS_PER_SECOND || this.ends.length >= MAX_VOICES) return null;
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
  celebrate(): void;
  say(text: string, preserve?: boolean): void;
  repeat(): void;
  configure(settings: Settings): void;
  unlock(): Promise<void>;
  stop(): void;
  dispose(): void;
}

export type NativeSpeech = Pick<ToddlerKeysBridge, 'speak' | 'stopSpeaking'>;

const SYMBOL_NAMES: Readonly<Record<string, string>> = {
  '!': 'exclamation mark', '@': 'at sign', '#': 'hash', '$': 'dollar sign', '%': 'percent',
  '^': 'caret', '&': 'ampersand', '*': 'asterisk', '(': 'left parenthesis', ')': 'right parenthesis',
  '-': 'minus', '_': 'underscore', '=': 'equals', '+': 'plus', '[': 'left bracket', ']': 'right bracket',
  '{': 'left brace', '}': 'right brace', '\\': 'backslash', '|': 'vertical bar', ';': 'semicolon',
  ':': 'colon', "'": 'apostrophe', '"': 'quotation mark', ',': 'comma', '.': 'period',
  '<': 'less than', '>': 'greater than', '/': 'slash', '?': 'question mark', '`': 'backtick', '~': 'tilde',
};

// Chromium's speech synthesis gets stuck (speaking stays true, every later
// utterance reports "canceled") when cancel() races a starting utterance,
// which happens as soon as several keys land in one burst. So we never cancel
// mid-utterance: one utterance plays at a time. Correct-letter feedback stays
// queued, while ordinary key guesses keep only the newest waiting key.
export const STUCK_SPEECH_MS = 4000;

export class SpeechGate {
  private startedAt: number | undefined;
  private waiting: { text: string; preserve: boolean }[] = [];
  constructor(private readonly now: () => number = () => performance.now()) {}

  get busy(): boolean { return this.startedAt !== undefined && !this.stuck; }
  get stuck(): boolean { return this.startedAt !== undefined && this.now() - this.startedAt >= STUCK_SPEECH_MS; }

  accept(text: string, preserve = false): string | null {
    if (this.busy) {
      this.waiting = this.waiting.filter(item => item.preserve);
      this.waiting.push({ text, preserve });
      return null;
    }
    this.waiting = [];
    this.startedAt = this.now();
    return text;
  }

  finished(): string | null {
    this.startedAt = undefined;
    const next = this.waiting.shift();
    if (!next) return null;
    this.startedAt = this.now();
    return next.text;
  }

  clear(): void { this.startedAt = undefined; this.waiting = []; }
}

export function spokenKey(key: PlayKey): string | null {
  if (key.phase !== 'down' || key.category === 'control') return null;
  return key.category === 'symbol' ? SYMBOL_NAMES[key.label] ?? key.label : key.label;
}

export function createSound(nativeSpeech?: NativeSpeech): Sound {
  let context: AudioContext | undefined;
  let settings: Settings = defaultSettings();
  let scheduler = new ToneScheduler();
  const voices = new Set<OscillatorNode>();
  let chime: OscillatorNode | undefined;
  const gate = new SpeechGate();
  // Chromium may drop utterance events when the object is garbage collected.
  let current: SpeechSynthesisUtterance | undefined;
  let lastText: string | null = null;

  const ensureContext = () => {
    if (!context) context = new AudioContext({ latencyHint: 'interactive' });
    return context;
  };
  const stopVoices = () => {
    for (const voice of voices) { try { voice.stop(); } catch { /* already stopped */ } }
    voices.clear();
    chime = undefined;
  };
  const stopSpeech = () => {
    speechGeneration++;
    nativeSpeech?.stopSpeaking();
    const wasBusy = gate.busy || gate.stuck;
    gate.clear();
    current = undefined;
    // cancel() is only needed while something is in flight; calling it right
    // before speak() is what wedges the synthesizer.
    if (wasBusy) try { window.speechSynthesis?.cancel(); } catch { /* speech remains optional */ }
  };
  const utterInBrowser = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.86;
    utterance.pitch = 1.08;
    utterance.volume = settings.volume;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(voice => voice.localService && voice.lang.toLowerCase().startsWith('en')) ?? null;
    const done = () => {
      if (current !== utterance) return;
      current = undefined;
      const next = gate.finished();
      if (next !== null) utter(next);
    };
    utterance.addEventListener('end', done, { once: true });
    utterance.addEventListener('error', done, { once: true });
    current = utterance;
    window.speechSynthesis.speak(utterance);
  };
  let speechGeneration = 0;
  const utter = (text: string) => {
    if (!nativeSpeech) { utterInBrowser(text); return; }
    const generation = speechGeneration;
    void nativeSpeech.speak(text, settings.volume).then(handled => {
      if (generation !== speechGeneration) return;
      if (!handled) { utterInBrowser(text); return; }
      const next = gate.finished();
      if (next !== null) utter(next);
    }).catch(() => {
      if (generation === speechGeneration) utterInBrowser(text);
    });
  };
  const say = (text: string | null, preserve = false) => {
    if (text) lastText = text;
    if (!text || !settings.sound || settings.volume <= 0 || !('speechSynthesis' in window)) return;
    if (gate.stuck) stopSpeech();
    const now = gate.accept(text, preserve);
    if (now !== null) utter(now);
  };


  return {
    async unlock() {
      if (!settings.sound) return;
      scheduler.start();
      if (settings.audioMode === 'speech' && settings.playMode !== 'find') return;
      try {
        const audio = ensureContext();
        if (audio.state === 'suspended') await audio.resume();
      } catch { /* sound remains optional */ }
    },
    accept(key) {
      if (settings.audioMode === 'speech') { say(spokenKey(key)); return; }
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
    celebrate() {
      if (!settings.sound || settings.volume <= 0) return;
      try {
        const audio = ensureContext();
        if (audio.state !== 'running') return;
        // A fresh success replaces the previous chime rather than stacking volume.
        if (chime) { chime.stop(); voices.delete(chime); }
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const start = audio.currentTime;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(659.25, start);
        oscillator.frequency.setValueAtTime(880, start + .09);
        oscillator.frequency.setValueAtTime(1046.5, start + .18);
        gain.gain.setValueAtTime(.0001, start);
        gain.gain.exponentialRampToValueAtTime(settings.volume * .10, start + .012);
        gain.gain.exponentialRampToValueAtTime(.0001, start + .38);
        oscillator.connect(gain).connect(audio.destination);
        chime = oscillator;
        voices.add(oscillator);
        oscillator.addEventListener('ended', () => {
          voices.delete(oscillator);
          if (chime === oscillator) chime = undefined;
          oscillator.disconnect(); gain.disconnect();
        }, { once: true });
        oscillator.start(start);
        oscillator.stop(start + .4);
      } catch { /* celebration remains visual if audio is unavailable */ }
    },
    say,
    repeat() { say(lastText); },
    configure(next) {
      const modeChanged = next.audioMode !== settings.audioMode;
      settings = { ...next };
      if (modeChanged || !settings.sound || settings.volume <= 0) { stopVoices(); stopSpeech(); }
    },
    stop() { lastText = null; scheduler.stop(); stopVoices(); stopSpeech(); },
    dispose() { scheduler.stop(); stopVoices(); stopSpeech(); if (context) void context.close(); context = undefined; },
  };
}
