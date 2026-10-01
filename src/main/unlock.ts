import type { PhysicalInput, UnlockProgress } from '../shared/contracts';

export interface UnlockRecognizer {
  input(event: PhysicalInput): boolean;
  tick(now: number): boolean;
  reset(): void;
  progress(): UnlockProgress;
}

const HOLD_MS = 2000;
const isK = (event: PhysicalInput) => event.code === 'KeyK' || event.key.toLowerCase() === 'k';
const isRequiredKey = (event: PhysicalInput) => isK(event)
  || event.code.startsWith('Control') || event.code.startsWith('Shift');
const hasRequiredModifiers = (event: PhysicalInput) => event.control && event.shift
  && !event.meta && !event.alt;

export function isUnlockStart(event: PhysicalInput): boolean {
  return event.type === 'down' && !event.repeat && isK(event)
    && event.control && event.shift && !event.meta && !event.alt;
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
    // Time updates the progress display, but cannot prove the keys are still
    // physically held. Completion requires a later keyboard event below.
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

      const heldLongEnough = now - holdAt >= HOLD_MS;

      // A repeat is evidence that K is still physically down. This preserves
      // automatic completion on systems with key repeat enabled.
      if (event.repeat && isK(event)) {
        if (!hasRequiredModifiers(event)) {
          reset();
          return false;
        }
        if (heldLongEnough) {
          reset();
          return true;
        }
        return false;
      }

      // Releasing one of the chord keys proves how long it was actually held.
      // This also works when OS-level key repeat is disabled.
      if (event.type === 'up' && isRequiredKey(event)) {
        reset();
        return heldLongEnough;
      }

      if (!hasRequiredModifiers(event)) {
        reset();
        return false;
      }
      if (event.type === 'down') reset();
      return false;
    },
  };
}
