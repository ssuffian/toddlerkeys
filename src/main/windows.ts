import { BrowserWindow, WebContentsView, screen, type WebContents, type IpcMainInvokeEvent, type IpcMainEvent } from 'electron';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { IPC, type AppSnapshot } from '../shared/contracts';
import { SessionController } from './session';
import { physicalInput, playKey } from './input';

const recoveryDocument = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>body{margin:0;background:#fbf4e8;color:#233b43;display:grid;place-content:center;height:100vh;font:24px system-ui;text-align:center}p{max-width:600px;line-height:1.6}</style></head><body><h1>Toddler Keys</h1><p>Taking a quiet moment.<br>A parent can use the exit sequence to return to setup.</p></body></html>`;
const recoveryURL = `data:text/html;charset=utf-8,${encodeURIComponent(recoveryDocument)}`;
const preferences = { nodeIntegration: false, contextIsolation: true, sandbox: true, devTools: false, webSecurity: true };

export class Windows {
  readonly primary: BrowserWindow;
  private view?: WebContentsView;
  private covers = new Map<number, BrowserWindow>();
  private lastState: AppSnapshot['state'] = 'setup';
  private lastHeartbeat = performance.now();
  private lastRecovery = -Infinity;
  private replacing = false;
  private protectedFallback = false;
  private disposed = false;
  private watchdog: ReturnType<typeof setInterval>;

  constructor(readonly controller: SessionController) {
    this.primary = new BrowserWindow({ width: 1000, height: 760, minWidth: 760, minHeight: 650, title: 'Toddler Keys', backgroundColor: '#fbf4e8', show: false, webPreferences: preferences });
    this.secure(this.primary.webContents);
    this.route(this.primary.webContents);
    void this.primary.loadURL(recoveryURL);
    this.guard(this.primary);
    this.primary.on('resize', () => this.sizeView());
    this.primary.on('enter-full-screen', () => { this.sizeView(); if (controller.active) this.refreshDisplays(); });
    this.primary.on('leave-full-screen', () => {
      this.sizeView();
      if (controller.active) this.primary.setFullScreen(true);
    });
    this.primary.on('closed', () => this.dispose());
    screen.on('display-added', this.displaysChanged);
    screen.on('display-removed', this.displaysChanged);
    screen.on('display-metrics-changed', this.displaysChanged);
    this.replaceView();
    this.watchdog = setInterval(() => {
      if (controller.active && !this.protectedFallback && performance.now() - this.lastHeartbeat > 6000) this.recover();
    }, 1000);
  }
  private displaysChanged = () => { this.discontinuity(); if (this.controller.active) this.refreshDisplays(); };
  private secure(contents: WebContents) {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
    contents.on('will-navigate', event => event.preventDefault());
    contents.on('will-frame-navigate', event => event.preventDefault());
    contents.on('will-attach-webview', event => event.preventDefault());
    contents.on('context-menu', event => event.preventDefault());
    contents.setIgnoreMenuShortcuts(true);
  }
  private guard(window: BrowserWindow) {
    window.on('close', event => { if (this.controller.active) event.preventDefault(); });
    window.on('blur', () => this.discontinuity());
    window.on('minimize', () => { if (this.controller.active) { window.restore(); window.focus(); } });
  }
  private route(contents: WebContents) {
    contents.on('before-input-event', (event, input) => {
      const physical = physicalInput(input, performance.now());
      if (!physical) return;
      // Setup remains a normal parent window; its keyboard chord is still main-owned.
      if (this.controller.active || physical.control && physical.shift || this.controller.snapshot().unlock.phase !== 'idle') event.preventDefault();
      if (this.controller.active && physical.type === 'down' && !physical.repeat && (physical.code === 'Escape' || physical.key === 'Escape') && this.controller.exitWithEscape()) return;
      const wasActive = this.controller.active;
      const unlockWasArmed = this.controller.snapshot().unlock.phase !== 'idle';
      this.controller.input(physical);
      const snapshot = this.controller.snapshot();
      const unlockIsArmed = snapshot.unlock.phase !== 'idle';
      if (wasActive && snapshot.state === 'playing' && !unlockWasArmed && !unlockIsArmed && (!physical.repeat || physical.type === 'up')) {
        const normalized = playKey(physical);
        if (normalized) this.send(IPC.key, normalized);
      }
    });
  }
  private sizeView() {
    if (!this.view || this.primary.isDestroyed()) return;
    const [width, height] = this.primary.getContentSize();
    this.view.setBounds({ x: 0, y: 0, width, height });
  }
  private replaceView() {
    if (this.disposed || this.primary.isDestroyed()) return;
    this.replacing = true;
    this.lastHeartbeat = performance.now();
    const old = this.view;
    this.view = undefined;
    if (old) {
      this.primary.contentView.removeChildView(old);
      // close() destroys the failed renderer without changing the native kiosk owner.
      old.webContents.close();
    }
    const view = new WebContentsView({ webPreferences: { ...preferences, preload: path.join(__dirname, 'preload.js') } });
    this.view = view;
    this.secure(view.webContents);
    this.route(view.webContents);
    this.primary.contentView.addChildView(view);
    this.sizeView();
    view.webContents.on('render-process-gone', () => { if (this.view === view) this.recover(); });
    view.webContents.on('unresponsive', () => { if (this.view === view) this.recover(); });
    view.webContents.once('did-finish-load', () => {
      if (this.view !== view || this.disposed) return;
      this.replacing = false;
      this.lastHeartbeat = performance.now();
      this.primary.show();
      view.webContents.focus();
      this.controller.recovered();
      this.update(this.controller.snapshot());
    });
    const loaded = MAIN_WINDOW_VITE_DEV_SERVER_URL
      ? view.webContents.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
      : view.webContents.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    void loaded.catch(() => { if (this.view === view) this.recover(); });
  }
  private recover() {
    if (this.disposed) return;
    if (!this.controller.active) {
      // Setup can close normally even if its renderer fails. No infinite reload loop.
      this.primary.show();
      if (!this.replacing) this.replaceView();
      return;
    }
    const now = performance.now();
    const repeatedFailure = this.replacing || now - this.lastRecovery < 30000;
    this.controller.recover();
    this.discontinuity();
    if (repeatedFailure) {
      this.protectedFallback = true;
      const old = this.view;
      this.view = undefined;
      if (old) { this.primary.contentView.removeChildView(old); old.webContents.close(); }
      this.primary.webContents.focus();
      return;
    }
    this.lastRecovery = now;
    this.replaceView();
  }
  heartbeat(event: IpcMainEvent) { if (this.accepts(event)) this.lastHeartbeat = performance.now(); }
  accepts(event: IpcMainInvokeEvent | IpcMainEvent) {
    return !!this.view && !this.view.webContents.isDestroyed() && event.sender === this.view.webContents && event.senderFrame === this.view.webContents.mainFrame;
  }
  private send(channel: string, value: unknown) { if (this.view && !this.view.webContents.isDestroyed()) this.view.webContents.send(channel, value); }
  update(snapshot: AppSnapshot) {
    const previous = this.lastState;
    this.lastState = snapshot.state;
    if (previous === 'setup' && snapshot.state !== 'setup') {
      this.lastRecovery = -Infinity;
      this.lastHeartbeat = performance.now();
      this.primary.setMinimizable(false);
      this.primary.setClosable(false);
      this.primary.setMovable(false);
      this.primary.setAlwaysOnTop(true, 'screen-saver');
      this.primary.setBounds(screen.getPrimaryDisplay().bounds);
      this.refreshDisplays();
      this.primary.setKiosk(true);
      this.primary.focus();
      this.view?.webContents.focus();
    } else if (previous !== 'setup' && snapshot.state === 'setup') {
      this.primary.setKiosk(false);
      for (const cover of this.covers.values()) cover.destroy();
      this.covers.clear();
      this.primary.setAlwaysOnTop(false);
      this.primary.setMinimizable(true);
      this.primary.setClosable(true);
      this.primary.setMovable(true);
      if (this.protectedFallback || !this.view) { this.protectedFallback = false; this.replaceView(); }
    }
    this.send(IPC.snapshot, snapshot);
  }
  private refreshDisplays() {
    const primaryId = screen.getPrimaryDisplay().id;
    const displays = screen.getAllDisplays().filter(display => display.id !== primaryId);
    for (const display of displays) {
      let cover = this.covers.get(display.id);
      if (!cover) {
        cover = new BrowserWindow({ ...display.bounds, frame: false, resizable: false, movable: false, minimizable: false, maximizable: false, closable: false, roundedCorners: false, hasShadow: false, backgroundColor: '#fbf4e8', show: false, webPreferences: preferences });
        this.secure(cover.webContents);
        this.route(cover.webContents);
        this.guard(cover);
        cover.setAlwaysOnTop(true, 'screen-saver');
        cover.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
        void cover.loadURL(recoveryURL);
        cover.showInactive();
        this.covers.set(display.id, cover);
      }
      cover.setBounds(display.bounds);
    }
    for (const [id, cover] of this.covers) if (!displays.some(display => display.id === id)) { cover.destroy(); this.covers.delete(id); }
    this.primary.setBounds(screen.getPrimaryDisplay().bounds);
  }
  discontinuity() { this.controller.discontinuity(); }
  focus() { if (!this.primary.isDestroyed()) { this.primary.show(); this.primary.focus(); this.view?.webContents.focus(); } }
  dispose() {
    this.disposed = true;
    clearInterval(this.watchdog);
    screen.removeListener('display-added', this.displaysChanged);
    screen.removeListener('display-removed', this.displaysChanged);
    screen.removeListener('display-metrics-changed', this.displaysChanged);
    this.view?.webContents.close();
    for (const cover of this.covers.values()) cover.destroy();
  }
}
