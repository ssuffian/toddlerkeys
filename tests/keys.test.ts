import { describe, expect, it } from 'vitest';
import { normalizeKey } from '../src/shared/keys';
import { key } from './helpers';

describe('key normalization', () => {
  it.each([
    ['KeyA', 'a', 'a', 'letter'], ['KeyA', 'A', 'A', 'letter'], ['Digit3', '3', '3', 'number'],
    ['Digit3', '#', '#', 'symbol'], ['Space', ' ', 'Space', 'control'], ['ArrowLeft', 'ArrowLeft', '←', 'control'],
    ['Enter', 'Enter', 'Enter', 'control'], ['Backspace', 'Backspace', 'Delete', 'control'],
    ['MetaLeft', 'Meta', '⌘', 'control'], ['ShiftRight', 'Shift', '⇧', 'control'],
    ['F12', 'F12', 'F12', 'control'], ['PageDown', 'PageDown', 'Page Down', 'control'],
  ] as const)('maps %s/%s to a friendly label', (code, delivered, label, category) => {
    expect(normalizeKey(key({ type: 'down', code, key: delivered, at: 8 }))).toMatchObject({ code, label, category, phase: 'down', at: 8 });
  });

  it('uses delivered Unicode printable characters instead of assuming a keyboard layout', () => {
    expect(normalizeKey(key({ type: 'down', code: 'KeyQ', key: 'ä' }))).toMatchObject({ label: 'ä', category: 'letter' });
  });

  it('suppresses repeated downs, preserves releases, and safely labels unknown delivered keys', () => {
    expect(normalizeKey(key({ type: 'down', code: 'KeyA', key: 'a', repeat: true }))).toBeNull();
    expect(normalizeKey(key({ type: 'up', code: 'KeyA', key: 'a', repeat: true }))).toMatchObject({ phase: 'up', label: 'a' });
    expect(normalizeKey(key({ type: 'down', code: 'AudioVolumeUp', key: 'AudioVolumeUp' }))).toMatchObject({ label: 'Special key', category: 'control' });
  });

  it('assigns a stable bounded color from physical key identity', () => {
    const first = normalizeKey(key({ type: 'down', code: 'KeyA', key: 'a' }))!;
    const shifted = normalizeKey(key({ type: 'down', code: 'KeyA', key: 'A' }))!;
    expect(first.colorIndex).toBe(shifted.colorIndex);
    expect(first.colorIndex).toBeGreaterThanOrEqual(0);
    expect(first.colorIndex).toBeLessThan(8);
  });
});
