import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Settings } from '../shared/contracts';

export const defaultSettings = (reducedMotion = false): Settings => ({ sound: true, volume: 0.15, reducedMotion, lockdownMode: false });

export function sanitizeSettings(value: unknown, fallback: Settings): Settings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...fallback };
  const candidate = value as Partial<Settings>;
  if (typeof candidate.sound !== 'boolean' || typeof candidate.reducedMotion !== 'boolean' || typeof candidate.volume !== 'number' || !Number.isFinite(candidate.volume)) return { ...fallback };
  return {
    sound: candidate.sound,
    volume: Math.max(0, Math.min(1, candidate.volume)),
    reducedMotion: candidate.reducedMotion,
    lockdownMode: typeof candidate.lockdownMode === 'boolean' ? candidate.lockdownMode : false,
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
