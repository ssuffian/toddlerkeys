import type { Input } from 'electron';
import type { PhysicalInput, PlayKey } from '../shared/contracts';
import { normalizeKey } from '../shared/keys';
export function physicalInput(input: Input, at: number): PhysicalInput | undefined {
  if (input.type !== 'keyDown' && input.type !== 'keyUp') return;
  return { type: input.type === 'keyDown' ? 'down' : 'up', key: input.key, code: input.code, meta: input.meta, alt: input.alt, shift: input.shift, control: input.control, repeat: input.isAutoRepeat, at };
}
export function playKey(input: PhysicalInput): PlayKey | null { return normalizeKey(input); }
