import type { PhysicalInput, UnlockProgress } from '../shared/contracts';

export interface UnlockRecognizer {
  input(event: PhysicalInput): boolean;
  tick(now: number): boolean;
  reset(): void;
  progress(): UnlockProgress;
}

const HOLD_MS = 2000;
const isK = (event: PhysicalInput) => event.code === 'KeyK' || event.key.toLowerCase() === 'k';

export function isUnlockStart(event: PhysicalInput): boolean {
  return event.type === 'down' && !event.repeat && isK(event)
    && event.meta && event.alt && !event.shift && !event.control;
}

export function createUnlockRecognizer(): UnlockRecognizer {
  let phase: UnlockProgress['phase'] = 'idle';
  let holdAt = 0;
  let now = 0;

  const reset = () => { phase = 'idle'; holdAt = 0; };
  const tick = (at: number): boolean => {
    if (!Number.isFinite(at) || at < now) {
      reset();
      if (Number.isFinite(at)) now = at;
      return false;
    }
    now = at;
    if (phase === 'holding' && now - holdAt >= HOLD_MS) {
      reset();
      return true;
    }
    return false;
  };

  return {
    reset,
    tick,
    progress: () => ({
      phase,
      holdProgress: phase === 'holding' ? Math.min(1, (now - holdAt) / HOLD_MS) : 0,
    }),
    input(event) {
      if (tick(event.at)) return true;

      if (phase === 'idle') {
        if (isK(event) && event.type === 'down' && event.repeat) return false;
        if (isUnlockStart(event)) {
          phase = 'holding';
          holdAt = now;
        }
        return false;
      }

      // Once armed, releasing K or either modifier, or adding another
      // modifier/key, cancels the attempt. Repeated K events are harmless.
      if (event.repeat && isK(event)) return false;
      if (!event.meta || !event.alt || event.shift || event.control || event.type === 'up' && isK(event)) {
        reset();
        return false;
      }
      if (event.type === 'down' && !isK(event)) reset();
      return false;
    },
  };
}
