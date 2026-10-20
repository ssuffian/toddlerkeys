import type { Settings } from './contracts';

// Shared by desktop, browser, session, and audio initialization.
export const defaultSettings = (reducedMotion = false): Settings => ({
  playMode: 'free',
  sound: true,
  audioMode: 'speech',
  volume: 1,
  instrument: 'softSynth',
  pictureTheme: 'mixed',
  reducedMotion,
  lockdownMode: true,
  showExitHint: true,
});
