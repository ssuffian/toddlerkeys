import './styles.css';
import type { AppSnapshot, Settings } from '../shared/contracts';
import { createScene } from './scene';
import { createSound } from './audio';
import { createBrowserBridge } from './browser-bridge';

const electronBridge = window.toddlerKeys;
const browserMode = !electronBridge;
const bridge = electronBridge ?? createBrowserBridge();

const select = <T extends Element>(selector: string): T => document.querySelector<T>(selector)!;
const setup = select<HTMLElement>('#setup');
const play = select<HTMLElement>('#play');
const recovering = select<HTMLElement>('#recovering');
const sceneRoot = select<HTMLElement>('#scene');
const start = select<HTMLButtonElement>('#start');
const progress = select<HTMLElement>('#progress');
const holdMeter = select<HTMLElement>('#hold-meter');
const playExitProgress = select<HTMLElement>('#play-exit-progress');
const soundControl = select<HTMLInputElement>('#sound');
const instrumentControl = select<HTMLSelectElement>('#instrument');
const volumeControl = select<HTMLInputElement>('#volume');
const volumeValue = select<HTMLOutputElement>('#volume-value');
const motionControl = select<HTMLInputElement>('#motion');
const exitHintControl = select<HTMLInputElement>('#exit-hint');
const lockdownControl = select<HTMLInputElement>('#lockdown');
const playHint = select<HTMLElement>('#play-hint');
const settingsStatus = select<HTMLElement>('#settings-status');
const scene = createScene(sceneRoot);
const sound = createSound();
let latest: AppSnapshot | undefined;
let lastState: AppSnapshot['state'] | undefined;
let renderedSettings = '';

if (browserMode) {
  document.documentElement.dataset.runtime = 'browser';
  select<HTMLElement>('#browser-note').hidden = false;
  select<HTMLButtonElement>('#quit').hidden = true;
  select<HTMLElement>('#lockdown-detail').textContent = 'Best effort in a browser; system shortcuts still work';
  if ('serviceWorker' in navigator) void navigator.serviceWorker.register('./sw.js');
}

function readControls(): Settings {
  return { sound: soundControl.checked, volume: Number(volumeControl.value), instrument: instrumentControl.value as Settings['instrument'], reducedMotion: motionControl.checked, lockdownMode: lockdownControl.checked, showExitHint: exitHintControl.checked };
}

function render(snapshot: AppSnapshot) {
  latest = snapshot;
  setup.hidden = snapshot.state !== 'setup';
  play.hidden = snapshot.state !== 'playing';
  recovering.hidden = snapshot.state !== 'recovering';
  start.disabled = !snapshot.practiced;
  const unlock = snapshot.unlock;
  progress.dataset.phase = unlock.phase;
  const holdPercent = Math.round(unlock.holdProgress * 100);
  holdMeter.style.setProperty('--hold-progress', `${holdPercent}%`);
  holdMeter.setAttribute('aria-valuenow', String(holdPercent));
  holdMeter.classList.toggle('active', unlock.phase === 'holding');
  playExitProgress.hidden = snapshot.state !== 'playing' || unlock.phase !== 'holding';
  playExitProgress.style.setProperty('--hold-progress', `${holdPercent}%`);
  progress.textContent = unlock.phase === 'holding'
    ? `Keep holding… ${Math.max(1, Math.ceil((1 - unlock.holdProgress) * 2))}`
    : snapshot.practiced ? 'Practice complete. You’re ready.' : 'Try the sequence now.';

  const settingsKey = JSON.stringify(snapshot.settings);
  if (settingsKey !== renderedSettings) {
    renderedSettings = settingsKey;
    soundControl.checked = snapshot.settings.sound;
    instrumentControl.value = snapshot.settings.instrument;
    volumeControl.value = String(snapshot.settings.volume);
    volumeValue.value = `${Math.round(snapshot.settings.volume * 100)}%`;
    motionControl.checked = snapshot.settings.reducedMotion;
    exitHintControl.checked = snapshot.settings.showExitHint;
    lockdownControl.checked = snapshot.settings.lockdownMode;
    playHint.textContent = snapshot.settings.showExitHint ? 'Parent exit: hold Control + Shift + K for 2 seconds' : 'Press any key';
    scene.setReducedMotion(snapshot.settings.reducedMotion);
    sound.configure(snapshot.settings);
  }
  if (lastState !== snapshot.state) {
    document.body.dataset.view = snapshot.state;
    if (snapshot.state === 'playing') void sound.unlock();
    else { sound.stop(); scene.clear(); }
    lastState = snapshot.state;
  }
}

async function saveControls() {
  settingsStatus.textContent = '';
  const accepted = await bridge.updateSettings(readControls()).catch(() => false);
  settingsStatus.textContent = accepted ? 'Saved' : 'Couldn’t save settings';
  window.setTimeout(() => { settingsStatus.textContent = ''; }, 1400);
}

bridge.onSnapshot(render);
bridge.onKey(key => { scene.accept(key); sound.accept(key); });
void bridge.getSnapshot().then(render);
start.addEventListener('click', () => { void sound.unlock(); void bridge.start(); });
select<HTMLButtonElement>('#quit').addEventListener('click', () => { void bridge.quitFromSetup(); });
soundControl.addEventListener('change', () => { sound.configure(readControls()); void saveControls(); });
instrumentControl.addEventListener('change', async () => {
  sound.configure(readControls());
  await sound.unlock();
  sound.accept({ phase: 'down', code: 'InstrumentPreview', label: '♪', category: 'symbol', colorIndex: 4, at: performance.now() });
  void saveControls();
});
volumeControl.addEventListener('input', () => { volumeValue.value = `${Math.round(Number(volumeControl.value) * 100)}%`; sound.configure(readControls()); });
volumeControl.addEventListener('change', () => { void saveControls(); });
motionControl.addEventListener('change', () => { scene.setReducedMotion(motionControl.checked); void saveControls(); });
exitHintControl.addEventListener('change', () => { void saveControls(); });
lockdownControl.addEventListener('change', () => { void saveControls(); });
play.addEventListener('pointerdown', event => {
  if (latest?.settings.reducedMotion) return;
  const existing = play.querySelectorAll('.pointer-ripple');
  if (existing.length >= 12) existing[0].remove();
  const ripple = document.createElement('i');
  ripple.className = 'pointer-ripple';
  ripple.style.left = `${event.clientX}px`;
  ripple.style.top = `${event.clientY}px`;
  play.append(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  window.setTimeout(() => ripple.remove(), 800);
});
document.addEventListener('contextmenu', event => { if (latest?.state === 'playing') event.preventDefault(); });
for (const eventName of ['dragstart', 'dragover', 'drop'] as const) document.addEventListener(eventName, event => event.preventDefault());
document.addEventListener('wheel', event => { if (latest?.state === 'playing' && event.ctrlKey) event.preventDefault(); }, { passive: false });
window.addEventListener('beforeunload', () => { scene.dispose(); sound.dispose(); });
