import type { PlayKey } from '../shared/contracts';

export const MAX_RECENT_KEYS = 8;

export class RecentKeys {
  values: PlayKey[] = [];

  accept(key: PlayKey): void {
    if (key.phase !== 'down' || key.category !== 'letter' && key.category !== 'number') return;
    this.values.push(key);
    if (this.values.length > MAX_RECENT_KEYS) this.values.splice(0, this.values.length - MAX_RECENT_KEYS);
  }

  clear(): void { this.values = []; }
}

export interface KeyHistory {
  accept(key: PlayKey): void;
  clear(): void;
}

export function createKeyHistory(root: HTMLElement): KeyHistory {
  const state = new RecentKeys();
  const render = () => {
    root.replaceChildren(...state.values.map(key => {
      const item = document.createElement('span');
      item.className = `history-key color-${key.colorIndex}`;
      item.textContent = key.label;
      return item;
    }));
    root.hidden = state.values.length === 0;
  };
  render();
  return {
    accept(key) { state.accept(key); render(); },
    clear() { state.clear(); render(); },
  };
}
