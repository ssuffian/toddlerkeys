import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type AppSnapshot, type PlayKey, type Settings, type ToddlerKeysBridge } from './shared/contracts';
const subscribe = <T>(channel: string, callback: (value: T) => void) => {
  const listener = (_event: Electron.IpcRendererEvent, value: T) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};
const bridge: ToddlerKeysBridge = Object.freeze({
  getSnapshot: () => ipcRenderer.invoke(IPC.getSnapshot),
  start: () => ipcRenderer.invoke(IPC.start),
  updateSettings: (settings: Settings) => ipcRenderer.invoke(IPC.settings, settings),
  quitFromSetup: () => ipcRenderer.invoke(IPC.quit),
  onSnapshot: (callback: (value: AppSnapshot) => void) => subscribe(IPC.snapshot, callback),
  onKey: (callback: (value: PlayKey) => void) => subscribe(IPC.key, callback),
});
contextBridge.exposeInMainWorld('toddlerKeys', bridge);
// Internal liveness signal is not exposed through the renderer bridge.
setInterval(() => ipcRenderer.send(IPC.heartbeat), 1000);
