import { describe, expect, it, vi } from 'vitest';
import type { PlayKey, Settings } from '../src/shared/contracts';
import { createSound, spokenKey, SpeechGate, STUCK_SPEECH_MS, ToneScheduler } from '../src/renderer/audio';
import { speechArguments } from '../src/main/speech';

const settings: Settings = { playMode: 'free', sound: true, audioMode: 'tones', volume: 0.15, instrument: 'marimba', pictureTheme: 'mixed', reducedMotion: false, lockdownMode: false, showExitHint: false };
const event = (index: number, phase: PlayKey['phase'] = 'down'): PlayKey => ({ phase, code: `Key${index}`, label: 'A', category: 'letter', colorIndex: index % 8, at: index });

describe('success chime', () => {
  it('unlocks in speech mode, respects volume and mute, and replaces rapid chimes without queuing', async () => {
    const oscillators: { stop: ReturnType<typeof vi.fn> }[] = [];
    const levels: number[] = [];
    class AudioStub {
      state = 'suspended';
      currentTime = 0;
      destination = {};
      async resume() { this.state = 'running'; }
      createOscillator() {
        const oscillator = {
          type: '', frequency: { setValueAtTime: vi.fn() },
          connect: (gain: unknown) => gain, addEventListener: vi.fn(),
          start: vi.fn(), stop: vi.fn(), disconnect: vi.fn(),
        };
        oscillators.push(oscillator);
        return oscillator;
      }
      createGain() {
        return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime(level: number) { levels.push(level); } }, connect() {}, disconnect() {} };
      }
    }
    vi.stubGlobal('AudioContext', AudioStub);
    const sound = createSound();
    try {
      sound.configure({ ...settings, playMode: 'find', audioMode: 'speech', volume: .5 });
      await sound.unlock();
      sound.celebrate();
      expect(oscillators).toHaveLength(1);
      expect(levels).toContain(.05);
      sound.celebrate();
      expect(oscillators).toHaveLength(2);
      expect(oscillators[0].stop).toHaveBeenCalledTimes(2);
      sound.configure({ ...settings, sound: false });
      expect(oscillators[1].stop).toHaveBeenCalledTimes(2);
      sound.celebrate();
      sound.configure({ ...settings, volume: 0 });
      sound.celebrate();
      expect(oscillators).toHaveLength(2);
    } finally { sound.stop(); vi.unstubAllGlobals(); }
  });
});

describe('tone scheduler', () => {
  it('emits nothing for muted, zero-volume, or keyup events', () => {
    const scheduler = new ToneScheduler(() => 0);
    expect(scheduler.accept(event(1), { ...settings, sound: false })).toBeNull();
    expect(scheduler.accept(event(1), { ...settings, volume: 0 })).toBeNull();
    expect(scheduler.accept(event(1, 'up'), settings)).toBeNull();
    expect(scheduler.accept(event(1), { ...settings, audioMode: 'speech' })).toBeNull();
  });

  it('speaks letters, numbers, and symbols but ignores control keys', () => {
    expect(spokenKey(event(1))).toBe('A');
    expect(spokenKey({ ...event(1), label: '7', category: 'number' })).toBe('7');
    expect(spokenKey({ ...event(1), label: '?', category: 'symbol' })).toBe('question mark');
    expect(spokenKey({ ...event(1), label: 'Ctrl', category: 'control' })).toBeNull();
    expect(spokenKey(event(1, 'up'))).toBeNull();
  });

  it('builds bounded Linux speech arguments without invoking a shell', () => {
    expect(speechArguments('A', 0.15)).toEqual(['-v', 'en-us', '-s', '150', '-p', '55', '-a', '30', 'A']);
    expect(speechArguments('', 0.5)).toBeNull();
    expect(speechArguments('A\nB', 0.5)).toBeNull();
    expect(speechArguments('A', Number.NaN)).toBeNull();
    expect(speechArguments('A', 2)).toBeNull();
  });

  it('allows at most four live voices and eight starts per second without queuing', () => {
    let now = 0;
    const scheduler = new ToneScheduler(() => now);
    expect(Array.from({ length: 5 }, (_, index) => scheduler.accept(event(index), settings)).filter(Boolean)).toHaveLength(4);
    expect(scheduler.activeVoices).toBe(4);
    now = 700;
    expect(Array.from({ length: 5 }, (_, index) => scheduler.accept(event(index + 5), settings)).filter(Boolean)).toHaveLength(4);
    expect(scheduler.accept(event(20), settings)).toBeNull();
    now = 1001;
    expect(scheduler.accept(event(21), settings)).not.toBeNull();
  });

  it('gives each instrument a distinct synthesized tone', () => {
    const tones = (['marimba', 'piano', 'bells', 'softSynth'] as const).map(instrument => {
      const scheduler = new ToneScheduler(() => 0);
      return scheduler.accept(event(1), { ...settings, instrument });
    });
    expect(new Set(tones.map(tone => `${tone?.waveform}:${tone?.duration}:${tone?.frequency}`)).size).toBe(4);
  });

  it('stop cancels scheduler state and rejects input until restarted', () => {
    const scheduler = new ToneScheduler(() => 0);
    scheduler.accept(event(1), settings);
    scheduler.stop();
    expect(scheduler.activeVoices).toBe(0);
    expect(scheduler.accept(event(2), settings)).toBeNull();
    scheduler.start();
    expect(scheduler.accept(event(3), settings)).not.toBeNull();
  });
});

describe('speech gate', () => {
  it('speaks immediately when idle and keeps only the latest key while busy', () => {
    const gate = new SpeechGate(() => 0);
    expect(gate.accept('A')).toBe('A');
    expect(gate.accept('B')).toBeNull();
    expect(gate.accept('C')).toBeNull();
    expect(gate.finished()).toBe('C');
    expect(gate.finished()).toBeNull();
    expect(gate.accept('D')).toBe('D');
  });

  it('retains every correct letter in order while coalescing wrong guesses', () => {
    const gate = new SpeechGate(() => 0);
    gate.accept('Find the A');
    gate.accept('A! Find the P', true);
    gate.accept('Z');
    gate.accept('P! Find the P', true);
    gate.accept('X');
    gate.accept('Y');
    expect(gate.finished()).toBe('A! Find the P');
    expect(gate.finished()).toBe('P! Find the P');
    expect(gate.finished()).toBe('Y');
    expect(gate.finished()).toBeNull();
  });

  it('never asks the caller to cancel between utterances', () => {
    const gate = new SpeechGate(() => 0);
    gate.accept('A');
    expect(gate.busy).toBe(true);
    gate.clear();
    expect(gate.busy).toBe(false);
    expect(gate.accept('B')).toBe('B');
  });

  it('recovers when an utterance never reports completion', () => {
    let now = 0;
    const gate = new SpeechGate(() => now);
    expect(gate.accept('A')).toBe('A');
    now = 1000;
    expect(gate.accept('B')).toBeNull();
    now = 1000 + STUCK_SPEECH_MS;
    expect(gate.stuck).toBe(true);
    expect(gate.accept('C')).toBe('C');
  });
});

describe('native speech sequencing', () => {
  it('waits for native speech to finish before speaking correct-letter feedback and later guesses', async () => {
    const { createSound } = await import('../src/renderer/audio');
    const { vi } = await import('vitest');
    vi.stubGlobal('window', { speechSynthesis: { cancel: vi.fn() } });
    const completions: ((handled: boolean) => void)[] = [];
    const speak = vi.fn(() => new Promise<boolean>(resolve => completions.push(resolve)));
    const sound = createSound({ speak, stopSpeaking: vi.fn() });
    sound.say('Find the A');
    sound.say('A! Find the P', true);
    sound.say('Z');
    sound.say('X');
    expect(speak.mock.calls).toHaveLength(1);
    completions.shift()!(true);
    await Promise.resolve();
    expect(speak).toHaveBeenLastCalledWith('A! Find the P', 1);
    completions.shift()!(true);
    await Promise.resolve();
    expect(speak).toHaveBeenLastCalledWith('X', 1);
    sound.stop();
    completions.shift()!(true);
    await Promise.resolve();
    expect(speak.mock.calls).toHaveLength(3);
    vi.unstubAllGlobals();
  });
});
