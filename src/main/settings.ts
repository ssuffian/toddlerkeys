import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AudioMode, Instrument, PictureTheme, Settings } from '../shared/contracts';

const instruments = new Set<Instrument>(['marimba', 'piano', 'bells', 'softSynth']);
const audioModes = new Set<AudioMode>(['tones', 'speech']);
const pictureThemes = new Set<PictureTheme>(['mixed', 'animals', 'food', 'transport']);
export { defaultSettings } from '../shared/settings';

export function sanitizeSettings(value: unknown, fallback: Settings): Settings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...fallback };
  const candidate = value as Partial<Settings>;
  if (typeof candidate.sound !== 'boolean' || typeof candidate.reducedMotion !== 'boolean' || typeof candidate.volume !== 'number' || !Number.isFinite(candidate.volume)) return { ...fallback };
  return {
    playMode: candidate.playMode === 'find' || candidate.playMode === 'free' ? candidate.playMode : fallback.playMode,
    sound: candidate.sound,
    audioMode: typeof candidate.audioMode === 'string' && audioModes.has(candidate.audioMode as AudioMode) ? candidate.audioMode as AudioMode : fallback.audioMode,
    volume: Math.max(0, Math.min(1, candidate.volume)),
    instrument: typeof candidate.instrument === 'string' && instruments.has(candidate.instrument as Instrument) ? candidate.instrument as Instrument : fallback.instrument,
    pictureTheme: typeof candidate.pictureTheme === 'string' && pictureThemes.has(candidate.pictureTheme as PictureTheme) ? candidate.pictureTheme as PictureTheme : fallback.pictureTheme,
    reducedMotion: candidate.reducedMotion,
    lockdownMode: typeof candidate.lockdownMode === 'boolean' ? candidate.lockdownMode : false,
    showExitHint: typeof candidate.showExitHint === 'boolean' ? candidate.showExitHint : fallback.showExitHint,
  };
}

export class SettingsStore {
  private readonly file: string;
  private pendingSave: Promise<void> = Promise.resolve();
  constructor(userData: string) { this.file = path.join(userData, 'settings.json'); }

  async load(fallback: Settings): Promise<Settings> {
    try { return sanitizeSettings(JSON.parse(await readFile(this.file, 'utf8')), fallback); }
    catch { return { ...fallback }; }
  }

  async save(settings: Settings): Promise<void> {
    const value = { ...settings };
    this.pendingSave = this.pendingSave.catch(() => undefined).then(async () => {
      await mkdir(path.dirname(this.file), { recursive: true });
      const temporary = `${this.file}.tmp`;
      await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
      await rename(temporary, this.file);
    });
    await this.pendingSave;
  }
}
