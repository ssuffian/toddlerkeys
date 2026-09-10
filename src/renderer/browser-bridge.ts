import { SessionController } from '../main/session';
import type { AppSnapshot, PhysicalInput, PlayKey, Settings, ToddlerKeysBridge } from '../shared/contracts';
import { normalizeKey } from '../shared/keys';

const SETTINGS_KEY = 'toddler-keys-settings';
const defaults = (): Settings => ({
  sound: true,
  volume: 0.15,
  instrument: 'marimba',
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  lockdownMode: false,
  showExitHint: false,
});

type KeyboardLockNavigator = Navigator & {
  keyboard?: { lock(keys?: string[]): Promise<void>; unlock(): void };
};

function storedSettings(): Settings {
  const fallback = defaults();
  try {
    const value = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? 'null');
    const validator = new SessionController(undefined, fallback);
    return validator.updateSettings(value) ? validator.snapshot().settings : fallback;
  } catch {
    return fallback;
  }
}

function physicalInput(event: KeyboardEvent, type: PhysicalInput['type'], mac: boolean): PhysicalInput {
  // Control is the practical Command equivalent for the browser build on
  // Windows/Linux. The native Mac app continues to use the real Command key.
  return {
    type,
    code: event.code,
    key: event.key,
    meta: mac ? event.metaKey : event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    control: mac ? event.ctrlKey : false,
    repeat: event.repeat,
    at: performance.now(),
  };
}

export function createBrowserBridge(): ToddlerKeysBridge {
  const snapshots = new Set<(snapshot: AppSnapshot) => void>();
  const keys = new Set<(key: PlayKey) => void>();
  const mac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
  let previousState: AppSnapshot['state'] = 'setup';

  const leaveFullscreen = () => {
    const keyboard = (navigator as KeyboardLockNavigator).keyboard;
    keyboard?.unlock();
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  };

  const controller = new SessionController(snapshot => {
    for (const callback of snapshots) callback(snapshot);
    if (previousState !== 'setup' && snapshot.state === 'setup') leaveFullscreen();
    previousState = snapshot.state;
  }, storedSettings());

  const route = (event: KeyboardEvent, type: PhysicalInput['type']) => {
    const physical = physicalInput(event, type, mac);
    const before = controller.snapshot();
    if (before.state === 'playing') event.preventDefault();

    if (before.state === 'playing' && type === 'down' && !physical.repeat && physical.code === 'Escape' && controller.exitWithEscape()) return;

    const unlockWasArmed = before.unlock.phase !== 'idle';
    controller.input(physical);
    const after = controller.snapshot();
    const unlockIsArmed = after.unlock.phase !== 'idle';
    if (unlockWasArmed || unlockIsArmed || physical.meta && physical.alt) event.preventDefault();

    if (before.state === 'playing' && after.state === 'playing' && !unlockWasArmed && !unlockIsArmed && (!physical.repeat || type === 'up')) {
      const normalized = normalizeKey(physical);
      if (normalized) for (const callback of keys) callback(normalized);
    }
  };

  window.addEventListener('keydown', event => route(event, 'down'), { capture: true });
  window.addEventListener('keyup', event => route(event, 'up'), { capture: true });
  window.addEventListener('blur', () => controller.discontinuity());
  document.addEventListener('visibilitychange', () => { if (document.hidden) controller.discontinuity(); });
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && controller.active) controller.exitWithEscape();
  });
  window.setInterval(() => controller.tick(performance.now()), 40);

  return Object.freeze({
    getSnapshot: async () => controller.snapshot(),
    start: async () => {
      if (!controller.start()) return false;
      try {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        if (controller.snapshot().settings.lockdownMode) await (navigator as KeyboardLockNavigator).keyboard?.lock(['Escape']);
      } catch {
        // Fullscreen and Keyboard Lock are enhancements. The play experience
        // remains available when a browser or permission policy refuses them.
      }
      return true;
    },
    updateSettings: async (settings: Settings) => {
      if (!controller.updateSettings(settings)) return false;
      try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(controller.snapshot().settings)); } catch { /* Storage may be disabled. */ }
      return true;
    },
    quitFromSetup: async () => false,
    onSnapshot(callback: (snapshot: AppSnapshot) => void) { snapshots.add(callback); return () => snapshots.delete(callback); },
    onKey(callback: (key: PlayKey) => void) { keys.add(callback); return () => keys.delete(callback); },
  });
}
