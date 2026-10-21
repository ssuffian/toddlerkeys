import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextWord, spellingWords } from '../src/renderer/spelling-words';
import { SpeechGate } from '../src/renderer/audio';
import { createFindGame, HINT_DELAY, MATCH_DELAY } from '../src/renderer/find-game';
import { normalizePlayableKey } from '../src/shared/keys';
import { key } from './helpers';

// A minimal element surface lets the round lifecycle run with fake timers.
class ElementStub {
  children: ElementStub[] = [];
  className = '';
  textContent = '';
  hidden = false;
  attributes = new Map<string, string>();
  classes = new Set<string>();
  style = { setProperty() {}, left: '', top: '' };
  classList = {
    add: (...names: string[]) => names.forEach(name => this.classes.add(name)),
    remove: (...names: string[]) => names.forEach(name => this.classes.delete(name)),
    toggle: (name: string, enabled: boolean) => enabled ? this.classes.add(name) : this.classes.delete(name),
  };
  append(...children: ElementStub[]) { this.children.push(...children); }
  replaceChildren(...children: ElementStub[]) { this.children = children; }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  removeAttribute(name: string) { this.attributes.delete(name); }
}


afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

function gameFixture() {
  vi.useFakeTimers();
  vi.stubGlobal('document', { createElement: () => new ElementStub() });
  const root = new ElementStub();
  const say = vi.fn();
  const chime = vi.fn();
  const game = createFindGame(root as unknown as HTMLElement, say, () => 0, chime);
  game.start();
  const [clue, prompt, slots, keyboard, celebration] = root.children;
  const keys = keyboard.children.flatMap(row => row.children);
  return { game, root, clue, prompt, slots, keys, celebration, say, chime };
}

const letter = (label: string, phase: 'down' | 'up' = 'down') => ({
  phase, code: `Key${label}`, label, category: 'letter' as const, colorIndex: 0, at: 0,
});

function press(game: ReturnType<typeof createFindGame>, label: string, repeat = false) {
  const normalized = normalizePlayableKey(key({ type: 'down', code: `Key${label}`, key: label, repeat }));
  return normalized ? game.accept(normalized) : false;
}

describe('spelling rounds', () => {
  it('shows the picture from the start and speaks wrong guesses without advancing', () => {
    const { game, clue, prompt, slots, keys, say } = gameFixture();
    expect(clue.children[0].textContent).toBe('🍎');
    expect(prompt.textContent).toBe('Find the A');
    expect(slots.children.map(slot => slot.textContent).join('')).toBe('APPLE');
    game.accept(letter('B', 'up'));
    expect(say).toHaveBeenCalledTimes(1);
    expect(game.accept(letter('B'))).toBe(false);
    expect(say).toHaveBeenLastCalledWith('B');
    expect(prompt.textContent).toBe('Find the A');
    vi.advanceTimersByTime(HINT_DELAY);
    expect(keys.find(key => key.textContent === 'A')?.classes.has('hint')).toBe(true);
  });

  it('requires every letter in order, including separate presses for repeated letters', () => {
    const { game, prompt, slots, celebration, root, say } = gameFixture();
    game.accept(letter('A')); game.accept(letter('A', 'up'));
    expect(prompt.textContent).toBe('Find the P');
    press(game, 'P'); press(game, 'P', true);
    expect(slots.children.filter(slot => slot.classes.has('complete'))).toHaveLength(2);
    expect(celebration.hidden).toBe(true);
    game.accept(letter('P', 'up')); game.accept(letter('P')); game.accept(letter('P', 'up'));
    expect(prompt.textContent).toBe('Find the L');
    for (const char of 'LE') { game.accept(letter(char)); game.accept(letter(char, 'up')); }
    expect(prompt.textContent).toBe('You spelled APPLE!');
    expect(say).toHaveBeenLastCalledWith('E! Hooray! You spelled Apple! Great job!', true);
    expect(celebration.hidden).toBe(false);
    expect(root.classes.has('word-complete')).toBe(true);
    expect(slots.children.every(slot => slot.classes.has('complete'))).toBe(true);
    const calls = say.mock.calls.length;
    game.accept(letter('Z'));
    expect(say).toHaveBeenCalledTimes(calls);
    vi.advanceTimersByTime(MATCH_DELAY);
    expect(prompt.textContent).toBe('Find the B');
    expect(celebration.hidden).toBe(true);
    expect(root.classes.has('word-complete')).toBe(false);
  });

  it('accepts a fresh press after an early guess even if its release was missed', () => {
    const { game, prompt, slots } = gameFixture();
    expect(press(game, 'P')).toBe(false);
    expect(press(game, 'A')).toBe(true);
    expect(press(game, 'P')).toBe(true);
    expect(slots.children.filter(slot => slot.classes.has('complete'))).toHaveLength(2);
    // Holding the key still cannot fill the second P, but a fresh press can.
    expect(press(game, 'P', true)).toBe(false);
    expect(press(game, 'P')).toBe(true);
    expect(prompt.textContent).toBe('Find the L');
    for (const char of 'LE') expect(press(game, char)).toBe(true);
    expect(prompt.textContent).toBe('You spelled APPLE!');
  });

  it('accepts rapid overlapping presses without waiting for feedback or animation', () => {
    const { game, prompt, slots } = gameFixture();
    expect(press(game, 'A')).toBe(true);
    expect(press(game, 'P')).toBe(true);
    game.accept(letter('P', 'up'));
    expect(press(game, 'P')).toBe(true);
    expect(press(game, 'L')).toBe(true);
    expect(press(game, 'E')).toBe(true);
    expect(prompt.textContent).toBe('You spelled APPLE!');
    expect(slots.children.every(slot => slot.classes.has('complete'))).toBe(true);
  });

  it('celebrates each correct letter and preserves its speech before rapid wrong guesses', () => {
    const { game, slots, say } = gameFixture();
    const gate = new SpeechGate(() => 0);
    gate.accept('Find the A');
    say.mockImplementation((text, preserve) => gate.accept(text, preserve));
    game.accept(letter('A'));
    expect(slots.children[0].classes.has('letter-celebration')).toBe(true);
    expect(slots.children[0].children[0].textContent).toBe('✦ ✨ ✦');
    game.accept(letter('Z'));
    game.accept(letter('X'));
    expect(gate.finished()).toBe('A! Find the P');
    expect(gate.finished()).toBe('X');
    vi.advanceTimersByTime(850);
    expect(slots.children[0].classes.has('letter-celebration')).toBe(false);
  });

  it('gives rapid correct letters independent confetti bursts and chimes', () => {
    const { game, slots, chime } = gameFixture();
    game.accept(letter('Z'));
    expect(chime).not.toHaveBeenCalled();
    game.accept(letter('A'));
    const firstSlot = slots.children[0];
    vi.advanceTimersByTime(200);
    game.accept(letter('P'));
    expect(slots.children[0]).toBe(firstSlot);
    expect(chime).toHaveBeenCalledTimes(2);
    for (const slot of slots.children.slice(0, 2)) {
      expect(slot.classes.has('letter-celebration')).toBe(true);
      expect(slot.children[1].className).toBe('letter-confetti');
      expect(slot.children[1].children).toHaveLength(16);
    }
    vi.advanceTimersByTime(650);
    expect(firstSlot.classes.has('letter-celebration')).toBe(false);
    expect(firstSlot.children).toHaveLength(0);
    expect(slots.children[1].classes.has('letter-celebration')).toBe(true);
    vi.advanceTimersByTime(200);
    expect(slots.children[1].classes.has('letter-celebration')).toBe(false);
    for (const char of 'PLE') game.accept(letter(char));
    expect(chime).toHaveBeenCalledTimes(5);
    game.stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('repeats the current instruction with Space without changing progress', () => {
    const { game, prompt, slots, say } = gameFixture();
    const space = { ...letter(' '), code: 'Space', category: 'control' as const };
    game.accept(letter('A'));
    game.accept(letter('Z'));
    game.accept(space);
    expect(say).toHaveBeenLastCalledWith('Find the P');
    expect(prompt.textContent).toBe('Find the P');
    expect(slots.children.filter(slot => slot.classes.has('complete'))).toHaveLength(1);
    const calls = say.mock.calls.length;
    const repeatSpace = normalizePlayableKey(key({ type: 'down', code: 'Space', key: ' ', repeat: true }));
    if (repeatSpace) game.accept(repeatSpace);
    expect(say).toHaveBeenCalledTimes(calls);
    game.accept({ ...space, phase: 'up' });
    game.accept(space);
    expect(say).toHaveBeenCalledTimes(calls + 1);
    for (const char of 'PPLE') { game.accept(letter(char)); game.accept(letter(char, 'up')); }
    game.accept({ ...space, phase: 'up' });
    game.accept(space);
    expect(say).toHaveBeenLastCalledWith('Hooray! You spelled Apple! Great job!');
  });

  it('stops hints and new rounds on exit and supports reduced motion', () => {
    const { game, root, celebration, say } = gameFixture();
    game.setReducedMotion(true);
    expect(root.classes.has('reduced-motion')).toBe(true);
    for (const char of 'APPLE') { game.accept(letter(char)); game.accept(letter(char, 'up')); }
    const calls = say.mock.calls.length;
    game.stop();
    vi.advanceTimersByTime(HINT_DELAY + MATCH_DELAY);
    expect(root.hidden).toBe(true);
    expect(celebration.hidden).toBe(true);
    expect(say).toHaveBeenCalledTimes(calls);
    expect(game.accept(letter('B'))).toBe(false);
  });

  it('offers short pictured words for every theme without immediate repeats', () => {
    for (const theme of ['mixed', 'animals', 'food', 'transport'] as const) {
      const words = spellingWords(theme);
      expect(words.length).toBeGreaterThan(1);
      for (const word of words) {
        expect(word.word).toMatch(/^[a-z]{3,5}$/i);
        expect(word.icon.length).toBeGreaterThan(0);
        expect(nextWord(theme, word.word, () => 0).word).not.toBe(word.word);
      }
    }
  });
});
