import { spawn, type ChildProcess } from 'node:child_process';

type Spawn = typeof spawn;

export function speechArguments(text: unknown, volume: unknown): string[] | null {
  if (typeof text !== 'string' || text.length === 0 || text.length > 64 || /[\r\n\0]/u.test(text)) return null;
  if (typeof volume !== 'number' || !Number.isFinite(volume) || volume <= 0 || volume > 1) return null;
  return [
    '-v', 'en-us',
    '-s', '150',
    '-p', '55',
    '-a', String(Math.max(1, Math.round(volume * 200))),
    text,
  ];
}

export class LinuxSpeech {
  private child?: ChildProcess;

  constructor(private readonly spawnProcess: Spawn = spawn) {}

  speak(text: unknown, volume: unknown): boolean {
    const args = speechArguments(text, volume);
    if (!args) return false;
    this.stop();
    const child = this.spawnProcess('espeak-ng', args, { stdio: 'ignore', windowsHide: true });
    this.child = child;
    child.once('error', () => { if (this.child === child) this.child = undefined; });
    child.once('exit', () => { if (this.child === child) this.child = undefined; });
    return true;
  }

  stop(): void {
    const child = this.child;
    this.child = undefined;
    if (child && !child.killed) child.kill();
  }
}
