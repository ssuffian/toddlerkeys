import { describe, expect, it } from 'vitest';
import type { PlayKey } from '../src/shared/contracts';
import { MAX_BUBBLES, MAX_PARTICLES, MAX_PICTURES, SceneState } from '../src/renderer/scene';
import { LETTER_PICTURES } from '../src/renderer/letter-pictures';

const event = (index: number, phase: PlayKey['phase'] = 'down'): PlayKey => ({
  phase, code: `Key${index}`, label: String(index), category: 'number', colorIndex: index % 8, at: index,
});

describe('scene state', () => {
  it('has one fixed picture for every letter in every theme', () => {
    expect(Object.keys(LETTER_PICTURES)).toEqual(['mixed', 'animals', 'food', 'transport']);
    expect(Object.values(LETTER_PICTURES).every(pictures => Object.keys(pictures).length === 26)).toBe(true);
    expect(Object.values(LETTER_PICTURES).every(pictures => Object.entries(pictures).every(([letter, picture]) => picture.word.startsWith(letter)))).toBe(true);
    expect(LETTER_PICTURES.animals.A).toEqual({ icon: '🐜', word: 'Ant' });
    expect(LETTER_PICTURES.transport.A).toEqual({ icon: '✈️', word: 'Airplane' });
  });

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

  it('keeps a themed letter picture until the next keypress replaces it', () => {
    let now = 0;
    const state = new SceneState(() => now, () => 0);
    state.accept({ ...event(1), code: 'KeyA', label: 'a', category: 'letter' }, false, 'animals');
    expect(state.pictures[0]).toMatchObject({ letter: 'A', icon: '🐜', word: 'Ant', slot: 0 });
    now = 60_000;
    state.sweep();
    expect(state.pictures).toHaveLength(1);
    state.accept({ ...event(2), code: 'KeyB', label: 'B', category: 'letter' }, false, 'animals');
    expect(state.pictures).toHaveLength(MAX_PICTURES);
    expect(state.pictures[0]).toMatchObject({ letter: 'B', icon: '🐻', word: 'Bear' });
  });

  it('keeps the picture collection bounded during repeated letter presses', () => {
    const state = new SceneState(() => 0, () => 0.5);
    for (let index = 0; index < 20; index += 1) state.accept({ ...event(index), code: 'KeyB', label: 'B', category: 'letter' });
    expect(state.pictures).toHaveLength(MAX_PICTURES);
  });

  it('removes the picture when the next printed key has no letter picture', () => {
    const state = new SceneState(() => 0, () => 0);
    state.accept({ ...event(1), code: 'KeyA', label: 'A', category: 'letter' });
    state.accept({ ...event(2), label: '2', category: 'number' });
    expect(state.pictures).toEqual([]);
  });
});
