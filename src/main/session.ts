import type { AppSnapshot, PhysicalInput, SessionState, Settings } from '../shared/contracts';
import { createUnlockRecognizer } from './unlock';
export class SessionController {
  private state: SessionState = 'setup';
  private practiced = false;
  private unlock = createUnlockRecognizer();
  private settings: Settings;
  constructor(private changed: (snapshot: AppSnapshot) => void = () => {}, settings: Settings = { sound: true, volume: 0.15, instrument: 'marimba', reducedMotion: false, lockdownMode: false }) { this.settings = { ...settings }; }
  get active() { return this.state !== 'setup'; }
  snapshot(): AppSnapshot { return { state: this.state, practiced: this.practiced, unlock: this.unlock.progress(), settings: { ...this.settings } }; }
  private publish() { this.changed(this.snapshot()); }
  input(event: PhysicalInput) {
    const before = JSON.stringify(this.unlock.progress());
    const previousState = this.state;
    if (this.unlock.input(event)) {
      if (this.state === 'setup') this.practiced = true;
      else this.state = 'setup';
    }
    if (this.state !== previousState || JSON.stringify(this.unlock.progress()) !== before) this.publish();
  }
  tick(now: number) {
    const before = JSON.stringify(this.unlock.progress());
    if (this.unlock.tick(now)) {
      if (this.state === 'setup') this.practiced = true;
      else this.state = 'setup';
    }
    if (JSON.stringify(this.unlock.progress()) !== before) this.publish();
  }
  discontinuity() { this.unlock.reset(); this.publish(); }
  start() {
    if (this.active || !this.practiced) return false;
    this.unlock.reset(); this.state = 'playing'; this.publish(); return true;
  }
  recover() {
    if (!this.active) return false;
    this.unlock.reset(); this.state = 'recovering'; this.publish(); return true;
  }
  recovered() {
    if (this.state !== 'recovering') return;
    this.unlock.reset(); this.state = 'playing'; this.publish();
  }
  exitWithEscape() {
    if (!this.active || this.settings.lockdownMode) return false;
    this.unlock.reset(); this.state = 'setup'; this.publish(); return true;
  }
  updateSettings(value: unknown) {
    if (this.active || !value || typeof value !== 'object' || Array.isArray(value)) return false;
    const s = value as Settings;
    if (typeof s.sound !== 'boolean' || typeof s.reducedMotion !== 'boolean' || typeof s.lockdownMode !== 'boolean' || !['marimba', 'piano', 'bells', 'softSynth'].includes(s.instrument) || typeof s.volume !== 'number' || !Number.isFinite(s.volume) || Object.keys(s).some(k => !['sound', 'volume', 'instrument', 'reducedMotion', 'lockdownMode'].includes(k))) return false;
    this.settings = { sound: s.sound, volume: Math.max(0, Math.min(1, s.volume)), instrument: s.instrument, reducedMotion: s.reducedMotion, lockdownMode: s.lockdownMode }; this.publish(); return true;
  }
}
