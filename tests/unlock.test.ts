import { describe, expect, it } from 'vitest';
import { createUnlockRecognizer } from '../src/main/unlock';
import { enterChord, key } from './helpers';

function beginChord(at = 0) {
  const unlock = createUnlockRecognizer();
  unlock.input(key({ type: 'down', code: 'MetaLeft', key: 'Meta', meta: true, at }));
  unlock.input(key({ type: 'down', code: 'AltLeft', key: 'Alt', meta: true, alt: true, at }));
  unlock.input(key({ type: 'down', code: 'KeyK', key: 'k', meta: true, alt: true, at }));
  return unlock;
}

describe('parent unlock recognizer', () => {
  it('completes after Command + Option + K is held for three seconds', () => {
    const unlock = createUnlockRecognizer();
    expect(enterChord(unlock)).toBe(true);
    expect(unlock.progress()).toEqual({ phase: 'idle', holdProgress: 0 });
  });

  it('arms from the K event modifier flags without separate modifier events', () => {
    const unlock = createUnlockRecognizer();
    unlock.input(key({ type: 'down', code: 'KeyK', key: 'k', meta: true, alt: true, at: 100 }));
    expect(unlock.progress().phase).toBe('holding');
    unlock.tick(1600);
    expect(unlock.progress().holdProgress).toBeCloseTo(0.5);
    expect(unlock.tick(3100)).toBe(true);
  });

  it('does not complete before the full hold duration', () => {
    const unlock = beginChord();
    expect(unlock.tick(2999)).toBe(false);
    expect(unlock.progress().phase).toBe('holding');
    unlock.input(key({ type: 'up', code: 'KeyK', key: 'k', meta: true, alt: true, at: 2999 }));
    expect(unlock.progress().phase).toBe('idle');
  });

  it('cancels when K or either modifier is released', () => {
    const releaseK = beginChord();
    releaseK.input(key({ type: 'up', code: 'KeyK', key: 'k', meta: true, alt: true, at: 1000 }));
    expect(releaseK.tick(3000)).toBe(false);

    const releaseOption = beginChord();
    releaseOption.input(key({ type: 'up', code: 'AltLeft', key: 'Alt', meta: true, alt: false, at: 1000 }));
    expect(releaseOption.tick(3000)).toBe(false);
  });

  it('cancels when any extra key or modifier is pressed', () => {
    for (const extra of [
      key({ type: 'down', code: 'KeyX', key: 'x', meta: true, alt: true, at: 1 }),
      key({ type: 'down', code: 'ShiftLeft', key: 'Shift', meta: true, alt: true, shift: true, at: 1 }),
      key({ type: 'down', code: 'ControlLeft', key: 'Control', meta: true, alt: true, control: true, at: 1 }),
    ]) {
      const unlock = beginChord();
      unlock.input(extra);
      expect(unlock.progress().phase).toBe('idle');
      expect(unlock.tick(3000)).toBe(false);
    }
  });

  it('ignores autorepeat and resets stale state on discontinuity', () => {
    const unlock = beginChord();
    unlock.input(key({ type: 'down', code: 'KeyK', key: 'k', meta: true, alt: true, repeat: true, at: 500 }));
    expect(unlock.progress().phase).toBe('holding');
    unlock.reset();
    expect(unlock.progress()).toEqual({ phase: 'idle', holdProgress: 0 });
  });
});
