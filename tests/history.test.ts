import { describe, expect, it } from 'vitest';
import type { PlayKey } from '../src/shared/contracts';
import { MAX_RECENT_KEYS, RecentKeys } from '../src/renderer/history';

const event = (label: string, category: PlayKey['category'] = 'letter', phase: PlayKey['phase'] = 'down'): PlayKey => ({
  phase, code: `Key${label}`, label, category, colorIndex: 0, at: 0,
});

describe('recent key history', () => {
  it('keeps only recent letters and numbers', () => {
    const history = new RecentKeys();
    history.accept(event('A'));
    history.accept(event('1', 'number'));
    history.accept(event('Ctrl', 'control'));
    history.accept(event('!', 'symbol'));
    history.accept(event('B', 'letter', 'up'));
    expect(history.values.map(key => key.label)).toEqual(['A', '1']);
  });

  it('keeps a bounded row and clears it', () => {
    const history = new RecentKeys();
    for (let index = 0; index < MAX_RECENT_KEYS + 3; index += 1) history.accept(event(String(index), 'number'));
    expect(history.values).toHaveLength(MAX_RECENT_KEYS);
    expect(history.values[0].label).toBe('3');
    history.clear();
    expect(history.values).toEqual([]);
  });
});
