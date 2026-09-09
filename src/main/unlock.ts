import type { PhysicalInput, UnlockProgress } from '../shared/contracts';
export interface UnlockRecognizer {
  input(event: PhysicalInput): boolean;
  tick(now: number): boolean;
  reset(): void;
  progress(): UnlockProgress;
}
const HOLD_MS = 3000;
const group = (code: string): string => code.replace(/Left$|Right$/, '');
const allowed = new Set(['Meta', 'Alt', 'KeyK']);

export function createUnlockRecognizer(): UnlockRecognizer {
  const held = new Set<string>();
  let phase: UnlockProgress['phase'] = 'idle';
  let holdAt = 0, now = 0;
  const clearAttempt = () => { phase = 'idle'; holdAt = 0; };
  const reset = () => { held.clear(); clearAttempt(); };
  const chord = () => held.size === 3 && new Set([...held].map(group)).size === 3 && [...held].every(code => allowed.has(group(code)));
  const tick = (at: number): boolean => {
    if (!Number.isFinite(at) || at < now) { reset(); now = Number.isFinite(at) ? at : now; return false; }
    now = at;
    if (phase === 'holding' && now - holdAt >= HOLD_MS) { reset(); return true; }
    return false;
  };
  return {
    reset,
    tick,
    progress: () => ({ phase, holdProgress: phase === 'holding' ? Math.min(1, (now - holdAt) / HOLD_MS) : 0 }),
    input(event) {
      if (tick(event.at)) return true;
      const duplicate = held.has(event.code);
      if (event.type === 'up') {
        held.delete(event.code);
        if (phase === 'holding') clearAttempt();
        return false;
      }
      // Repeats never start/advance a hold or a password, even after a discontinuity.
      if (event.repeat || duplicate) return false;
      held.add(event.code);
      if (![...held].every(code => allowed.has(group(code))) || event.control || event.shift) {
        clearAttempt(); return false;
      }
      if (chord() && event.meta && event.alt && !event.shift && !event.control) {
        phase = 'holding'; holdAt = now;
      }
      return false;
    },
  };
}
