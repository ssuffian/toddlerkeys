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
  target.input(key({ type: 'down', code: 'MetaLeft', key: 'Meta', meta: true, at }));
  target.input(key({ type: 'down', code: 'AltLeft', key: 'Alt', meta: true, alt: true, at }));
  target.input(key({ type: 'down', code: 'KeyK', key: 'k', meta: true, alt: true, at }));
  return Boolean(target.tick(at + 2000));
}
