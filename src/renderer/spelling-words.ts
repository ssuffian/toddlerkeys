import type { PictureTheme } from '../shared/contracts';
import { LETTER_PICTURES, type LetterPicture } from './letter-pictures';

// Short, familiar words keep each round manageable for early keyboard play.
export function spellingWords(theme: PictureTheme): LetterPicture[] {
  return Object.values(LETTER_PICTURES[theme]).filter(picture => /^[a-z]{3,5}$/i.test(picture.word));
}

export function nextWord(theme: PictureTheme, previous: string, random = Math.random): LetterPicture {
  const choices = spellingWords(theme).filter(picture => picture.word !== previous);
  return choices[Math.floor(random() * choices.length)];
}
