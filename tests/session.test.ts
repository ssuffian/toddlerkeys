import { describe, expect, it, vi } from 'vitest';
import { SessionController } from '../src/main/session';
import { enterChord, key } from './helpers';

function practice(controller: SessionController, at = 0) { enterChord(controller, at); }

describe('session lifecycle', () => {
  it('requires practice before play and returns to setup only after parent unlock', () => {
    const changed = vi.fn();
    const controller = new SessionController(changed);
    expect(controller.start()).toBe(false);
    practice(controller);
    expect(controller.snapshot().practiced).toBe(true);
    expect(controller.start()).toBe(true);
    expect(controller.active).toBe(true);
    enterChord(controller, 10_000);
    expect(controller.snapshot().state).toBe('setup');
    expect(controller.active).toBe(false);
  });

  it('keeps unlock available during renderer recovery and clears stale attempts', () => {
    const controller = new SessionController();
    practice(controller);
    controller.start();
    expect(controller.recover()).toBe(true);
    expect(controller.snapshot().state).toBe('recovering');
    enterChord(controller, 10_000);
    expect(controller.snapshot().state).toBe('setup');

    practice(controller);
    controller.start();
    controller.input(key({ type: 'down', code: 'ControlLeft', key: 'Control', control: true, at: 20_000 }));
    controller.discontinuity();
    expect(controller.snapshot().unlock.phase).toBe('idle');
  });

  it('validates, clamps, and locks settings while playing', () => {
    const controller = new SessionController();
    expect(controller.updateSettings({ sound: false, volume: 2, instrument: 'bells', reducedMotion: true, lockdownMode: false, showExitHint: true })).toBe(true);
    expect(controller.snapshot().settings).toEqual({ sound: false, volume: 1, instrument: 'bells', reducedMotion: true, lockdownMode: false, showExitHint: true });
    expect(controller.updateSettings({ sound: true, volume: Number.NaN, instrument: 'piano', reducedMotion: false, lockdownMode: false, showExitHint: false })).toBe(false);
    practice(controller);
    controller.start();
    expect(controller.updateSettings({ sound: true, volume: 0.5, instrument: 'piano', reducedMotion: false, lockdownMode: false, showExitHint: false })).toBe(false);
  });

  it('lets Escape return to setup unless lockdown mode is enabled', () => {
    const controller = new SessionController();
    practice(controller);
    controller.start();
    expect(controller.exitWithEscape()).toBe(true);
    expect(controller.snapshot().state).toBe('setup');
    expect(controller.updateSettings({ ...controller.snapshot().settings, lockdownMode: true })).toBe(true);
    controller.start();
    expect(controller.exitWithEscape()).toBe(false);
    expect(controller.snapshot().state).toBe('playing');
  });

  it('does not publish full snapshots for ordinary play keys', () => {
    const changed = vi.fn();
    const controller = new SessionController(changed);
    practice(controller);
    controller.start();
    changed.mockClear();
    controller.input(key({ type: 'down', code: 'KeyA', key: 'a', at: 5000 }));
    controller.input(key({ type: 'up', code: 'KeyA', key: 'a', at: 5001 }));
    expect(changed).not.toHaveBeenCalled();
  });
});
