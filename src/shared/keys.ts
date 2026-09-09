import type { PhysicalInput, PlayKey } from './contracts';

const CONTROL_LABELS: Readonly<Record<string, string>> = {
  ' ': 'Space', Space: 'Space', Spacebar: 'Space',
  Enter: 'Enter', Return: 'Enter', Tab: 'Tab', Backspace: 'Delete', Delete: 'Delete',
  Escape: 'Esc', Esc: 'Esc', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  Meta: '⌘', Command: '⌘', Alt: '⌥', Option: '⌥', Shift: '⇧', Control: '⌃', CapsLock: 'Caps Lock',
  Home: 'Home', End: 'End', PageUp: 'Page Up', PageDown: 'Page Down', Insert: 'Insert',
};

function stableColor(code: string): number {
  let hash = 2166136261;
  for (const character of code) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 8;
}

export function normalizeKey(input: PhysicalInput): PlayKey | null {
  if (!input.code || !Number.isFinite(input.at) || input.type === 'down' && input.repeat) return null;

  const controlLabel = CONTROL_LABELS[input.key] ?? CONTROL_LABELS[input.code.replace(/Left$|Right$/, '')];
  let label: string;
  let category: PlayKey['category'];

  const functionKey = /^F(?:[1-9]|1\d|2[0-4])$/.test(input.key) ? input.key : undefined;
  if (controlLabel || functionKey) {
    label = controlLabel ?? functionKey!;
    category = 'control';
  } else if (Array.from(input.key).length === 1 && !/\p{C}/u.test(input.key)) {
    label = input.key;
    category = /\p{L}/u.test(label) ? 'letter' : /\p{N}/u.test(label) ? 'number' : 'symbol';
  } else {
    label = 'Special key';
    category = 'control';
  }

  return { phase: input.type, code: input.code, label, category, colorIndex: stableColor(input.code), at: input.at };
}
