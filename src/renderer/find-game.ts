import type { PictureTheme, PlayKey } from '../shared/contracts';

import { nextWord } from './spelling-words';
import type { LetterPicture } from './letter-pictures';
export const HINT_DELAY = 5000;
export const MATCH_DELAY = 6500;

export function createFindGame(root: HTMLElement, say: (text: string, preserve?: boolean) => void, random = Math.random, chime = () => {}) {
  const prompt = document.createElement('span');
  prompt.className = 'find-instruction';
  const clue = document.createElement('div');
  clue.className = 'spelling-clue';
  const picture = document.createElement('span');
  picture.className = 'spelling-picture';
  picture.setAttribute('role', 'img');
  const wordTitle = document.createElement('span');
  wordTitle.className = 'spelling-title';
  clue.append(picture, wordTitle);
  const slots = document.createElement('div');
  slots.className = 'spelling-slots';
  slots.setAttribute('aria-label', 'Word progress');
  const keyboard = document.createElement('div');
  keyboard.className = 'find-keyboard';
  keyboard.setAttribute('aria-label', 'Keyboard letter positions');
  const keys = new Map<string, HTMLElement>();
  for (const row of ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']) {
    const element = document.createElement('div');
    element.className = 'find-keyboard-row';
    for (const letter of row) {
      const key = document.createElement('span');
      key.className = 'find-key';
      key.textContent = letter;
      keys.set(letter, key);
      element.append(key);
    }
    keyboard.append(element);
  }
  const celebration = document.createElement('div');
  celebration.className = 'find-celebration';
  celebration.setAttribute('aria-hidden', 'true');
  celebration.hidden = true;
  for (let burst = 0; burst < 3; burst++) {
    for (let index = 0; index < 16; index++) {
      const spark = document.createElement('i');
      const angle = index * Math.PI * 2 / 16;
      spark.className = `firework-spark color-${(burst + index) % 8}`;
      spark.style.left = `${20 + burst * 30}%`;
      spark.style.top = `${burst === 1 ? 20 : 55}%`;
      spark.style.setProperty('--spark-x', `${Math.cos(angle) * (75 + index % 3 * 18)}px`);
      spark.style.setProperty('--spark-y', `${Math.sin(angle) * (75 + index % 3 * 18)}px`);
      spark.style.setProperty('--spark-delay', `${burst * 130}ms`);
      celebration.append(spark);
    }
  }
  root.replaceChildren(clue, prompt, slots, keyboard, celebration);
  let theme: PictureTheme = 'mixed';
  let word: LetterPicture | undefined;
  let position = 0;
  let active = false;
  let matched = false;
  let target = '';
  let instruction = '';
  let letterSlots: HTMLElement[] = [];
  const letterTimers = new Set<ReturnType<typeof setTimeout>>();
  let hintTimer: ReturnType<typeof setTimeout> | undefined;
  let nextTimer: ReturnType<typeof setTimeout> | undefined;
  const clearTimers = () => {
    clearTimeout(hintTimer); clearTimeout(nextTimer);
    for (const timer of letterTimers) clearTimeout(timer);
    letterTimers.clear();
  };
  const clearKeyHints = () => {
    for (const key of keys.values()) { key.classList.remove('hint', 'found'); key.removeAttribute('aria-label'); }
  };
  const showProgress = () => {
    for (const [index, slot] of letterSlots.entries()) {
      slot.classList.toggle('complete', index < position);
      slot.classList.toggle('current', index === position);
      if (index === position) slot.setAttribute('aria-current', 'step');
      else slot.removeAttribute('aria-current');
    }
  };
  const celebrateLetter = (index: number) => {
    const slot = letterSlots[index];
    slot.classList.add('letter-celebration');
    const stars = document.createElement('span');
    stars.className = 'letter-stars';
    stars.textContent = '✦ ✨ ✦';
    stars.setAttribute('aria-hidden', 'true');
    const confetti = document.createElement('span');
    confetti.className = 'letter-confetti';
    confetti.setAttribute('aria-hidden', 'true');
    for (let piece = 0; piece < 16; piece++) {
      const flake = document.createElement('i');
      const angle = Math.PI + (piece + .5) * Math.PI / 16;
      flake.className = `confetti-piece color-${piece % 8}`;
      flake.style.setProperty('--confetti-x', `${Math.cos(angle) * (45 + piece % 3 * 15)}px`);
      flake.style.setProperty('--confetti-y', `${Math.sin(angle) * (55 + piece % 3 * 18)}px`);
      flake.style.setProperty('--confetti-turn', `${piece % 2 ? 240 : -210}deg`);
      confetti.append(flake);
    }
    slot.append(stars, confetti);
    const timer = setTimeout(() => {
      letterTimers.delete(timer);
      slot.classList.remove('letter-celebration');
      slot.replaceChildren();
      slot.textContent = word!.word[index].toUpperCase();
    }, 850);
    letterTimers.add(timer);
    chime();
  };
  const askLetter = (correctLetter?: string) => {
    clearKeyHints();
    target = word!.word[position].toUpperCase();
    prompt.textContent = `Find the ${target}`;
    instruction = `Find the ${target}`;
    say(correctLetter ? `${correctLetter}! ${instruction}` : instruction, !!correctLetter);
    hintTimer = setTimeout(() => {
      keys.get(target)?.classList.add('hint');
      keys.get(target)?.setAttribute('aria-label', `${target}, look here`);
    }, HINT_DELAY);
    showProgress();
  };
  const ask = () => {
    clearTimers();
    matched = false;
    celebration.hidden = true;
    root.classList.remove('word-complete');
    word = nextWord(theme, word?.word ?? '', random);
    position = 0;
    letterSlots = Array.from(word.word, letter => {
      const slot = document.createElement('span');
      slot.className = 'spelling-slot';
      slot.textContent = letter.toUpperCase();
      return slot;
    });
    slots.replaceChildren(...letterSlots);
    picture.textContent = word.icon;
    picture.setAttribute('aria-label', word.word);
    wordTitle.textContent = `Let’s spell ${word.word.toUpperCase()}`;
    askLetter();
  };
  return {
    start() { active = true; root.hidden = false; ask(); },
    accept(key: PlayKey): boolean {
      if (!active || key.phase === 'up') return false;
      // Both bridges filter auto-repeat before delivering PlayKey events.
      // Each down is a fresh press, even if a prior release was lost.
      if (key.code === 'Space') { say(instruction); return false; }
      if (matched) return false;
      if (key.category !== 'letter') return false;
      if (key.label.toUpperCase() !== target) { say(key.label); return false; }
      clearTimeout(hintTimer);
      const correctLetter = target;
      const correctPosition = position;
      position++;
      showProgress();
      celebrateLetter(correctPosition);
      if (position < word!.word.length) {
        askLetter(correctLetter);
        return true;
      }
      matched = true;
      clearKeyHints();
      keys.get(target)?.classList.add('found');
      celebration.hidden = false;
      root.classList.add('word-complete');
      prompt.textContent = `You spelled ${word!.word.toUpperCase()}!`;
      wordTitle.textContent = 'Amazing! Great job!';
      instruction = `Hooray! You spelled ${word!.word}! Great job!`;
      say(`${correctLetter}! ${instruction}`, true);
      nextTimer = setTimeout(ask, MATCH_DELAY);
      return true;
    },
    setPictureTheme(next: PictureTheme) { theme = next; },
    setReducedMotion(enabled: boolean) { root.classList.toggle('reduced-motion', enabled); },
    stop() { celebration.hidden = true; active = false; clearTimers(); root.hidden = true; },
  };
}
