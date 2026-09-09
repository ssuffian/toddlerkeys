import type { PlayKey } from '../shared/contracts';
import { LETTER_PICTURES } from './letter-pictures';

export const MAX_BUBBLES = 9;
export const MAX_PARTICLES = 64;
export const MAX_PICTURES = 4;
export const PICTURE_PRESS_LIFETIME = 4;
const TRAIL_MS = 1800;
const PARTICLE_MS = 720;

export type SceneBubble = PlayKey & { id: number; bornAt: number; expiresAt: number; held: boolean };
export type SceneParticle = { id: number; colorIndex: number; bornAt: number; expiresAt: number; angle: number; distance: number };
export type ScenePicture = { id: number; letter: string; icon: string; word: string; slot: number; pressesLeft: number };

export class SceneState {
  bubbles: SceneBubble[] = [];
  particles: SceneParticle[] = [];
  pictures: ScenePicture[] = [];
  private sequence = 0;
  private held = new Map<string, number>();
  constructor(private readonly now: () => number = () => performance.now(), private readonly random: () => number = Math.random) {}

  accept(key: PlayKey, reducedMotion = false): void {
    const now = this.now();
    this.sweep(now);
    if (key.phase === 'up') {
      const id = this.held.get(key.code);
      const bubble = this.bubbles.find(item => item.id === id);
      if (bubble) bubble.held = false;
      this.held.delete(key.code);
      return;
    }

    this.pictures = this.pictures.map(picture => ({ ...picture, pressesLeft: picture.pressesLeft - 1 })).filter(picture => picture.pressesLeft > 0);
    const letter = key.label.length === 1 ? key.label.toUpperCase() : '';
    const choices = LETTER_PICTURES[letter];
    if (choices) {
      const choice = choices[Math.floor(this.random() * choices.length) % choices.length];
      const occupiedSlots = new Set(this.pictures.map(picture => picture.slot));
      const availableSlots = Array.from({ length: 8 }, (_, slot) => slot).filter(slot => !occupiedSlots.has(slot));
      const slot = availableSlots[Math.floor(this.random() * availableSlots.length) % availableSlots.length];
      this.pictures.push({ id: ++this.sequence, letter, ...choice, slot, pressesLeft: PICTURE_PRESS_LIFETIME });
      if (this.pictures.length > MAX_PICTURES) this.pictures.splice(0, this.pictures.length - MAX_PICTURES);
    }

    const previousForCode = this.held.get(key.code);
    const previouslyHeld = this.bubbles.find(item => item.id === previousForCode);
    if (previouslyHeld) previouslyHeld.held = false;
    const previous = this.bubbles.at(-1);
    if (previous) previous.expiresAt = Math.min(previous.expiresAt, now + TRAIL_MS);
    const bubble: SceneBubble = { ...key, id: ++this.sequence, bornAt: now, expiresAt: Number.POSITIVE_INFINITY, held: true };
    this.bubbles.push(bubble);
    this.held.set(key.code, bubble.id);
    while (this.bubbles.length > MAX_BUBBLES) {
      const removed = this.bubbles.shift();
      if (removed && this.held.get(removed.code) === removed.id) this.held.delete(removed.code);
    }

    if (!reducedMotion) {
      for (let index = 0; index < 8; index += 1) {
        const angle = (Math.PI * 2 * index) / 8 + (key.colorIndex % 3) * 0.13;
        this.particles.push({ id: ++this.sequence, colorIndex: (key.colorIndex + index) % 8, bornAt: now, expiresAt: now + PARTICLE_MS, angle, distance: 72 + (index % 3) * 22 });
      }
      if (this.particles.length > MAX_PARTICLES) this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    }
  }

  sweep(now = this.now()): void {
    this.bubbles = this.bubbles.filter(bubble => bubble.expiresAt > now);
    this.particles = this.particles.filter(particle => particle.expiresAt > now);
  }

  get animating(): boolean {
    return this.particles.length > 0 || this.bubbles.some(bubble => Number.isFinite(bubble.expiresAt));
  }

  clear(): void { this.bubbles = []; this.particles = []; this.pictures = []; this.held.clear(); }
}

export interface Scene {
  accept(key: PlayKey): void;
  setReducedMotion(enabled: boolean): void;
  clear(): void;
  dispose(): void;
}

export function createScene(root: HTMLElement): Scene {
  const state = new SceneState();
  let reducedMotion = false;
  let frame = 0;
  let disposed = false;
  root.innerHTML = '<div class="scene-glow" aria-hidden="true"></div><div class="picture-layer"></div><div class="bubble-layer"></div><div class="particle-layer" aria-hidden="true"></div><p class="key-announcer" aria-live="polite" aria-atomic="true"></p>';
  const pictureLayer = root.querySelector<HTMLElement>('.picture-layer')!;
  const bubbleLayer = root.querySelector<HTMLElement>('.bubble-layer')!;
  const particleLayer = root.querySelector<HTMLElement>('.particle-layer')!;
  const announcer = root.querySelector<HTMLElement>('.key-announcer')!;
  const bubbleElements = new Map<number, HTMLElement>();
  const particleElements = new Map<number, HTMLElement>();
  const pictureElements = new Map<number, HTMLElement>();

  const render = (now = performance.now()) => {
    state.sweep(now);
    const pictureIds = new Set(state.pictures.map(picture => picture.id));
    for (const [id, element] of pictureElements) if (!pictureIds.has(id)) { element.remove(); pictureElements.delete(id); }
    state.pictures.forEach(picture => {
      let element = pictureElements.get(picture.id);
      if (!element) {
        element = document.createElement('div');
        element.className = `letter-picture picture-slot-${picture.slot}`;
        element.setAttribute('role', 'img');
        element.setAttribute('aria-label', `${picture.letter} is for ${picture.word}`);
        const icon = document.createElement('span');
        icon.className = 'picture-icon';
        icon.textContent = picture.icon;
        const caption = document.createElement('span');
        caption.className = 'picture-caption';
        caption.textContent = picture.word;
        element.append(icon, caption);
        pictureElements.set(picture.id, element);
        pictureLayer.append(element);
      }
      element.style.opacity = String(Math.min(1, 0.42 + picture.pressesLeft * 0.15));
    });
    const latestId = state.bubbles.at(-1)?.id;
    const bubbleIds = new Set(state.bubbles.map(bubble => bubble.id));
    for (const [id, element] of bubbleElements) if (!bubbleIds.has(id)) { element.remove(); bubbleElements.delete(id); }
    state.bubbles.forEach((bubble, index) => {
      let element = bubbleElements.get(bubble.id);
      if (!element) {
        element = document.createElement('div');
        const glyph = document.createElement('span');
        glyph.className = 'key-glyph';
        glyph.textContent = bubble.label;
        element.append(glyph);
        bubbleElements.set(bubble.id, element);
        bubbleLayer.append(element);
      }
      const latest = bubble.id === latestId;
      element.className = `key-bubble color-${bubble.colorIndex} category-${bubble.category}${latest ? ' newest' : ' trail'}${bubble.held ? ' held' : ''}`;
      element.dataset.code = bubble.code;
      const trailIndex = state.bubbles.length - 1 - index;
      if (!latest) {
        const direction = trailIndex % 2 ? -1 : 1;
        element.style.setProperty('--trail-x', `${direction * (88 + trailIndex * 42)}px`);
        element.style.setProperty('--trail-y', `${-46 + (trailIndex % 3) * 74}px`);
        const lifetime = Math.max(1, bubble.expiresAt - bubble.bornAt);
        element.style.opacity = String(Math.max(0, Math.min(0.7, (bubble.expiresAt - now) / lifetime)));
      } else {
        element.style.removeProperty('--trail-x');
        element.style.removeProperty('--trail-y');
        element.style.removeProperty('opacity');
      }
    });

    const particleIds = new Set(state.particles.map(particle => particle.id));
    for (const [id, element] of particleElements) if (!particleIds.has(id)) { element.remove(); particleElements.delete(id); }
    state.particles.forEach(particle => {
      const progress = Math.min(1, Math.max(0, (now - particle.bornAt) / (particle.expiresAt - particle.bornAt)));
      let element = particleElements.get(particle.id);
      if (!element) {
        element = document.createElement('i');
        element.className = `particle color-${particle.colorIndex}`;
        particleElements.set(particle.id, element);
        particleLayer.append(element);
      }
      element.style.transform = `translate(${Math.cos(particle.angle) * particle.distance * progress}px, ${Math.sin(particle.angle) * particle.distance * progress}px) scale(${1 - progress * 0.45})`;
      element.style.opacity = String(1 - progress);
    });
  };

  const animate = (now: number) => {
    frame = 0;
    if (disposed) return;
    render(now);
    if (state.animating) frame = requestAnimationFrame(animate);
  };
  const requestAnimation = () => { if (!frame && state.animating) frame = requestAnimationFrame(animate); };

  return {
    accept(key) {
      state.accept(key, reducedMotion);
      if (key.phase === 'down') announcer.textContent = key.label;
      render();
      requestAnimation();
    },
    setReducedMotion(enabled) {
      reducedMotion = enabled;
      root.classList.toggle('reduced-motion', enabled);
      if (enabled) state.particles = [];
      render();
    },
    clear() { state.clear(); pictureLayer.replaceChildren(); bubbleLayer.replaceChildren(); particleLayer.replaceChildren(); pictureElements.clear(); bubbleElements.clear(); particleElements.clear(); announcer.textContent = ''; },
    dispose() { disposed = true; if (frame) cancelAnimationFrame(frame); state.clear(); pictureElements.clear(); bubbleElements.clear(); particleElements.clear(); root.replaceChildren(); },
  };
}
