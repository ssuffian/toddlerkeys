export type SessionState = 'setup' | 'playing' | 'recovering';
export type PhysicalInput = {
  type: 'down' | 'up'; code: string; key: string;
  meta: boolean; alt: boolean; shift: boolean; control: boolean;
  repeat: boolean; at: number;
};
export type UnlockProgress = {
  phase: 'idle' | 'holding';
  holdProgress: number;
};
export type Instrument = 'marimba' | 'piano' | 'bells' | 'softSynth';
export type Settings = { sound: boolean; volume: number; instrument: Instrument; reducedMotion: boolean; lockdownMode: boolean; showExitHint: boolean };
export type PlayKey = {
  phase: 'down' | 'up';
  code: string;
  label: string;
  category: 'letter' | 'number' | 'symbol' | 'control';
  colorIndex: number;
  at: number;
};
export type AppSnapshot = {
  state: SessionState; practiced: boolean; unlock: UnlockProgress; settings: Settings;
};
export interface ToddlerKeysBridge {
  getSnapshot(): Promise<AppSnapshot>;
  start(): Promise<boolean>;
  updateSettings(settings: Settings): Promise<boolean>;
  quitFromSetup(): Promise<boolean>;
  onSnapshot(callback: (snapshot: AppSnapshot) => void): () => void;
  onKey(callback: (key: PlayKey) => void): () => void;
}
export const IPC = {
  snapshot: 'toddler:snapshot', getSnapshot: 'toddler:get-snapshot', key: 'toddler:key',
  start: 'toddler:start', settings: 'toddler:settings', quit: 'toddler:quit-from-setup', heartbeat: 'toddler:heartbeat',
} as const;
declare global { interface Window { toddlerKeys?: ToddlerKeysBridge } }
