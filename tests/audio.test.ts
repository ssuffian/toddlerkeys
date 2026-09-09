import { describe, expect, it } from 'vitest';
import type { PlayKey, Settings } from '../src/shared/contracts';
import { ToneScheduler } from '../src/renderer/audio';

const settings: Settings = { sound: true, volume: 0.15, instrument: 'marimba', reducedMotion: false, lockdownMode: false };
const event = (index: number, phase: PlayKey['phase'] = 'down'): PlayKey => ({ phase, code: `Key${index}`, label: 'A', category: 'letter', colorIndex: index % 8, at: index });

describe('tone scheduler', () => {
  it('emits nothing for muted, zero-volume, or keyup events', () => {
    const scheduler = new ToneScheduler(() => 0);
    expect(scheduler.accept(event(1), { ...settings, sound: false })).toBeNull();
    expect(scheduler.accept(event(1), { ...settings, volume: 0 })).toBeNull();
    expect(scheduler.accept(event(1, 'up'), settings)).toBeNull();
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
