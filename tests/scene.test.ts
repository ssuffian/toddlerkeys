import { describe, expect, it } from 'vitest';
import type { PlayKey } from '../src/shared/contracts';
import { MAX_BUBBLES, MAX_PARTICLES, SceneState } from '../src/renderer/scene';

const event = (index: number, phase: PlayKey['phase'] = 'down'): PlayKey => ({
  phase, code: `Key${index}`, label: String(index), category: 'number', colorIndex: index % 8, at: index,
});

describe('scene state', () => {
  it('keeps a stationary newest glyph and expires older trail bubbles', () => {
    let now = 0;
    const state = new SceneState(() => now);
    state.accept(event(1));
    now = 100;
    state.accept(event(2));
    expect(state.bubbles.map(bubble => bubble.label)).toEqual(['1', '2']);
    expect(state.bubbles.at(-1)?.expiresAt).toBe(Number.POSITIVE_INFINITY);
    now = 2001;
    state.sweep();
    expect(state.bubbles.map(bubble => bubble.label)).toEqual(['2']);
  });

  it('tracks releases by physical code and clears all state', () => {
    const state = new SceneState(() => 0);
    state.accept(event(1));
    state.accept(event(1, 'up'));
    expect(state.bubbles[0].held).toBe(false);
    state.clear();
    expect(state.bubbles).toEqual([]);
    expect(state.particles).toEqual([]);
  });

  it('replaces a missed release when the same physical key is pressed again', () => {
    const state = new SceneState(() => 0);
    state.accept(event(1));
    state.accept(event(1));
    expect(state.bubbles.at(-2)?.held).toBe(false);
    expect(state.bubbles.at(-1)?.held).toBe(true);
  });

  it('stays bounded through a 10,000-event burst', () => {
    const state = new SceneState(() => 0);
    for (let index = 0; index < 10_000; index += 1) state.accept(event(index));
    expect(state.bubbles.length).toBe(MAX_BUBBLES);
    expect(state.particles.length).toBe(MAX_PARTICLES);
  });

  it('creates no particles in reduced-motion mode', () => {
    const state = new SceneState(() => 0);
    state.accept(event(1), true);
    expect(state.particles).toHaveLength(0);
  });
});
