import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { defaultSettings, sanitizeSettings, SettingsStore } from '../src/main/settings';

describe('settings validation', () => {
  it('uses the OS reduced-motion preference only for defaults', () => {
    expect(defaultSettings(true)).toEqual({ sound: true, volume: 0.15, instrument: 'marimba', reducedMotion: true, lockdownMode: false });
  });

  it('loads complete valid values and clamps volume', () => {
    const fallback = defaultSettings(false);
    expect(sanitizeSettings({ sound: false, volume: -2, instrument: 'bells', reducedMotion: true, lockdownMode: true }, fallback)).toEqual({ sound: false, volume: 0, instrument: 'bells', reducedMotion: true, lockdownMode: true });
  });

  it('keeps Lockdown off when loading settings saved by an older build', () => {
    const fallback = defaultSettings(false);
    expect(sanitizeSettings({ sound: true, volume: 0.2, reducedMotion: false }, fallback)).toMatchObject({ instrument: 'marimba', lockdownMode: false });
  });

  it('falls back as a unit for corrupt or incomplete data', () => {
    const fallback = defaultSettings(true);
    expect(sanitizeSettings({ sound: false, volume: 'loud', reducedMotion: false }, fallback)).toEqual(fallback);
    expect(sanitizeSettings(null, fallback)).toEqual(fallback);
  });

  it('serializes overlapping saves so the newest preference wins', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'toddlerkeys-settings-'));
    const store = new SettingsStore(directory);
    const first = store.save({ sound: true, volume: 0.1, instrument: 'piano', reducedMotion: false, lockdownMode: false });
    const second = store.save({ sound: false, volume: 0.7, instrument: 'softSynth', reducedMotion: true, lockdownMode: true });
    await Promise.all([first, second]);
    expect(JSON.parse(await readFile(path.join(directory, 'settings.json'), 'utf8'))).toEqual({ sound: false, volume: 0.7, instrument: 'softSynth', reducedMotion: true, lockdownMode: true });
  });
});
