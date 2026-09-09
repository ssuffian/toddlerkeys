import { app, ipcMain, Menu, powerMonitor, session as electronSession, systemPreferences } from 'electron';
import { performance } from 'node:perf_hooks';
import { IPC } from '../shared/contracts';
import { SessionController } from './session';
import { defaultSettings, SettingsStore } from './settings';
import { Windows } from './windows';

let windows: Windows | undefined;
const controller = new SessionController(snapshot => windows?.update(snapshot));
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => windows?.focus());
  app.on('before-quit', event => { if (controller.active) event.preventDefault(); });
  app.on('window-all-closed', () => { if (!controller.active) app.quit(); });
  app.on('activate', () => windows?.focus());
  void app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    // Nothing in the packaged app requires network access or device permissions.
    electronSession.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    electronSession.defaultSession.setPermissionCheckHandler(() => false);
    electronSession.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      let url: URL;
      try { url = new URL(details.url); } catch { callback({ cancel: true }); return; }
      const local = url.protocol === 'file:' || url.protocol === 'data:' || url.protocol === 'devtools:' && !app.isPackaged;
      const development = !app.isPackaged && MAIN_WINDOW_VITE_DEV_SERVER_URL && url.origin === new URL(MAIN_WINDOW_VITE_DEV_SERVER_URL).origin;
      callback({ cancel: !(local || development) });
    });
    const settingsStore = new SettingsStore(app.getPath('userData'));
    const initialSettings = await settingsStore.load(defaultSettings(systemPreferences.getAnimationSettings().prefersReducedMotion));
    controller.updateSettings(initialSettings);
    windows = new Windows(controller);
    ipcMain.handle(IPC.getSnapshot, event => { if (!windows?.accepts(event)) throw new Error('Invalid sender'); return controller.snapshot(); });
    ipcMain.handle(IPC.start, event => !!windows?.accepts(event) && controller.start());
    ipcMain.handle(IPC.settings, async (event, settings: unknown) => {
      if (!windows?.accepts(event) || !controller.updateSettings(settings)) return false;
      await settingsStore.save(controller.snapshot().settings);
      return true;
    });
    ipcMain.handle(IPC.quit, event => {
      if (!windows?.accepts(event) || controller.active) return false;
      app.quit(); return true;
    });
    ipcMain.on(IPC.heartbeat, event => windows?.heartbeat(event));
    powerMonitor.on('suspend', () => windows?.discontinuity());
    powerMonitor.on('resume', () => windows?.discontinuity());
    powerMonitor.on('lock-screen', () => windows?.discontinuity());
    powerMonitor.on('unlock-screen', () => windows?.discontinuity());
    const timer = setInterval(() => controller.tick(performance.now()), 40);
    app.once('will-quit', () => clearInterval(timer));
  });
}
