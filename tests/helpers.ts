import type { PhysicalInput } from '../src/shared/contracts';

export function key(overrides: Partial<PhysicalInput> & Pick<PhysicalInput, 'type' | 'code'>): PhysicalInput {
  const modifier = overrides.code.replace(/Left$|Right$/, '');
  return {
    key: overrides.code.startsWith('Key') ? overrides.code.slice(3).toLowerCase() : modifier,
    meta: modifier === 'Meta', alt: modifier === 'Alt', shift: modifier === 'Shift', control: modifier === 'Control',
    repeat: false, at: 0, ...overrides,
  };
}

export function enterChord(target: { input(event: PhysicalInput): unknown; tick(now: number): unknown }, at = 0): boolean {
  target.input(key({ type: 'down', code: 'ControlLeft', key: 'Control', control: true, at }));
  target.input(key({ type: 'down', code: 'ShiftLeft', key: 'Shift', control: true, shift: true, at }));
  target.input(key({ type: 'down', code: 'KeyK', key: 'k', control: true, shift: true, at }));
  return Boolean(target.tick(at + 2000));
}
