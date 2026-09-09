# Toddler Keys Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an engaging offline macOS keyboard-smash app with legible key feedback and verified parent-controlled kiosk sessions.

**Architecture:** Electron main process owns containment, input routing, and unlock recognition. An isolated TypeScript renderer provides bounded visual/audio feedback through a narrow preload bridge. Prove OS containment before investing in the final renderer.

**Tech Stack:** Electron, TypeScript, Vite, Electron Forge, DOM/CSS, Canvas, Web Audio, Vitest, Playwright's Electron integration.

**Spec:** [Proposed design](../specs/2026-09-08-toddlerkeys-design.md). This is a planning deliverable, not evidence that the app exists or the kiosk tests pass. Platform assumption: macOS first.

## Global Constraints

- Local assets only; no accounts, network services, telemetry, or stored key history.
- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.
- No renderer-callable unrestricted quit method.
- Development runs start unlocked.
- Target visible feedback within 100 ms on the tested Mac.
- Bound live bubbles to nine and decorative particles to 64.
- Maximum four concurrent voices and eight tone starts per second.
- OS autorepeat creates no additional bubble or sound.
- An untested row is not a pass.
- Electron, macOS, and keyboard support are determined by the feasibility result. At execution, choose a current supported stable Electron release, pin it and dependencies in the lockfile, and record exact versions. Do not invent version pins in this research-only plan.

## Model allocation and execution order

| Task | Implementer | Review | Reason |
| --- | --- | --- | --- |
| 1. Kiosk feasibility | Astra, high | Parent verifies physical interactions | OS behavior and architectural uncertainty |
| 2. Session and parent exit | Astra, high | Sol tests contract | Cross-event state and recovery correctness |
| 3. Key normalization and bridge | Sol, medium | Astra boundary review | Bounded implementation, important trust boundary |
| 4. Visual play scene | Sol, medium | Visual inspection | Straightforward product implementation |
| 5. Audio and parent settings | Sol, medium | Sol | Bounded local behavior |
| 6. Packaging and integration | Sol, medium | Astra for escape audit only | Routine assembly plus a consequential final check |

The allocation is an engineering recommendation: reserve Astra for uncertain systems work and use Sol for clearly specified implementation. Official guidance describes Astra as the most capable model for difficult work and Sol as a model for complex professional work; it does not prescribe this project's task split. [Astra](https://developers.openai.com/api/docs/models/gpt-6-astra), [Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol).

Sequence: 1 → 2 → 3 → 4/5 → 6. After Task 3, visual work and sound/settings work can run in separate Sol agents with distinct file ownership. Use a short task brief, relevant spec sections, and interface contracts instead of copying an entire research transcript into each agent. Escalate failures involving OS containment to Astra. Do not keep Astra supervising routine edits continuously.

## File map

| Files | Responsibility |
| --- | --- |
| `package.json`, `package-lock.json`, `tsconfig.json`, `forge.config.ts`, `vite.*.config.ts`, `.gitignore` | Build, checks, local packaging |
| `src/main/main.ts` | App entry, single instance, assembly |
| `src/main/session.ts`, `src/main/unlock.ts` | Trusted lifecycle and deterministic parent sequence |
| `src/main/windows.ts`, `src/main/input.ts` | Kiosk windows, display coverage, event interception |
| `src/main/settings.ts` | Validated local parent preferences |
| `src/shared/contracts.ts`, `src/shared/keys.ts` | Bridge types and pure key normalization |
| `src/preload.ts` | Narrow context bridge |
| `src/renderer/index.html`, `src/renderer/main.ts`, `src/renderer/styles.css` | Parent/play UI and visual styling |
| `src/renderer/scene.ts`, `src/renderer/audio.ts` | Bounded scene state and sound scheduling |
| `tests/unlock.test.ts`, `tests/keys.test.ts`, `tests/scene.test.ts`, `tests/audio.test.ts`, `tests/session.test.ts` | Meaningful behavioral tests |
| `tests/app.e2e.ts` | Packaged-app integration behavior |
| `docs/kiosk-validation.md`, `README.md` | Actual OS test results and usage/build instructions |

## Task 1: Prove the kiosk contract before committing to Electron

**Owner:** Astra. **Files:** build/config files, minimal `src/main/main.ts`, `src/main/windows.ts`, minimal renderer, `docs/kiosk-validation.md`.

**Consumes:** design containment contract. **Produces:** runnable minimal app, exact dependency pins, evidence table, and go/no-go decision. Prototype code is labeled experimental until this gate passes.

- [ ] Initialize project tooling and Git during execution, if desired; the planning turn does not initialize a repository. Use the official Forge Vite/TypeScript template as the scaffold, keeping its compatible config structure. Record runtime versions.
- [ ] Create a normal setup window and explicit Start control. Keep dev launches unlocked. Use this options baseline for the local renderer:

```ts
const windowOptions = {
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    devTools: false,
  },
};
// Resolve the built preload path in main; enter kiosk only after Start.
// Inspect the chosen release's macOS SetKiosk implementation as well.
```

- [ ] Add a prototype parent exit and a temporary recovery timeout to the spike. The timeout is an adult-testing aid and must not ship as an ordinary child exit route.
- [ ] Package and launch on the actual Mac. Test all rows below with a physical keyboard/trackpad. A renderer-level simulated shortcut is insufficient.
- [ ] Test display covering windows before and after hotplug. Verify containment with more than one display; focus changes must not disable input handling.
- [ ] Record each result as blocked, intended parent exit, failed, or outside the documented contract. Include steps, macOS/Electron versions, hardware, and observed behavior.
- [ ] If an ordinary escape remains, investigate a specific native AppKit fix or an explicit supported-configuration requirement. Re-run only affected tests and dependent recovery cases. Do not proceed with a known required escape failure.

Manual rows: Command-Q/W/H/M/Tab; Command-Option-Escape; Escape; Control-Command-F; Spotlight; Mission Control; Launchpad if available; Spaces gestures; hot corners; screen edges/Dock; context menu; Fn/media keys; display hotplug; lid/sleep/wake; keyboard disconnect; rapid input; parent unlock; renderer crash/hang; restoration after exit.

**Gate:** verified containment on the documented target configuration, with an adult-accessible recovery method during development. Save the evidence and commit the working spike only when accepted as the foundation.

## Task 2: Trusted session lifecycle and deliberate parent exit

**Owner:** Astra. **Files:** `src/main/session.ts`, `src/main/unlock.ts`, `src/main/windows.ts`, `tests/unlock.test.ts`, `tests/session.test.ts`.

**Consumes:** Task 1's working window behavior. **Produces:** pure unlock recognizer plus main-owned session transitions.

```ts
export type SessionState = 'setup' | 'playing' | 'recovering';
export type PhysicalInput = {
  type: 'down' | 'up'; code: string; key: string;
  meta: boolean; alt: boolean; shift: boolean; control: boolean;
  repeat: boolean; at: number;
};
export interface UnlockRecognizer {
  input(event: PhysicalInput): boolean; // true only on complete sequence
  tick(now: number): void;             // advance hold/timeout using monotonic time
  reset(): void;
}
export function createUnlockRecognizer(): UnlockRecognizer;
```

- [ ] Write failing tests for a three-second Command/Option/K hold that completes immediately. A successful practice uses the same recognizer but never changes kiosk state.
- [ ] Add cases for early release, extra keys or modifiers, repeated keydown, stale key state after blur/sleep/disconnect, and a correct sequence entered while recovery is active.
- [ ] Implement the recognizer as a deterministic state machine driven by main-process monotonic time. Use a main timer for the hold; do not depend on autorepeat or renderer animation frames. Reset incomplete attempts on focus/device/session discontinuities.
- [ ] Implement setup → playing after practice, and playing/recovering → setup only after successful unlock. Block window close and ordinary app quit during the session. Remove guards and covers during intentional parent exit.
- [ ] Recover crashed renderer windows without exposing a usable desktop. For an unresponsive renderer, attempt one bounded replacement and show a protected recovery view if unsuccessful. Validate keyboard routing into replacement windows; main-process ownership alone does not prove input survives a hung renderer.
- [ ] Run `npm test -- tests/unlock.test.ts tests/session.test.ts`. Expected: all behavioral cases pass. Then physically exercise the exit while smashing keys and after renderer recovery. Save/commit only after both checks pass.

**Gate:** no malformed sequence exits; the correct sequence exits consistently; ordinary desktop behavior is restored; the recovery path has physical test evidence.

## Task 3: Normalize keys and expose a narrow input bridge

**Owner:** Sol. **Files:** `src/shared/contracts.ts`, `src/shared/keys.ts`, `src/main/input.ts`, `src/preload.ts`, `tests/keys.test.ts`.

**Consumes:** `PhysicalInput`, trusted session state. **Produces:** the renderer contract below.

```ts
export type PlayKey = {
  code: string; label: string;
  category: 'letter' | 'number' | 'symbol' | 'control';
  phase: 'down' | 'up'; at: number;
};
export type Settings = { sound: boolean; volume: number; reducedMotion: boolean };
export interface ToddlerAPI {
  onKey(callback: (key: PlayKey) => void): () => void;
  onState(callback: (state: 'setup' | 'playing' | 'recovering') => void): () => void;
  onPractice(callback: (complete: boolean) => void): () => void;
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;
  startPlay(): Promise<void>;
}
export function normalizeKey(input: PhysicalInput): PlayKey | null;
```

- [ ] Write failing normalization tests for lowercase/uppercase letters, digit 3, shifted #, Space, arrows, Enter, Backspace, modifiers, unknown keys, autorepeat, and keyup. Suppress repeated down events, preserve releases, and use a friendly fallback for unrecognized delivered keys.
- [ ] Implement pure normalization. Use the delivered character for printable output and physical `code` for held-state identity and the unlock chord. Do not assume all keyboards are US layout.
- [ ] In main `before-input-event`, feed unlock first. During play prevent page/menu defaults and deliberately forward normalized events. Suppress the parent code from visual/audio play feedback once unlock is armed.
- [ ] Expose the bridge with `contextBridge.exposeInMainWorld`; validate IPC sender against the owned window and check session state for settings and Start. Only main-recognized practice enables Start. Deny navigation/window creation and remove production app menu accelerators.
- [ ] Run `npm test -- tests/keys.test.ts` and an integration check: Command-Q remains in the session while ordinary Q still appears. Confirm no duplicate events and unsubscribe cleanup on renderer reload. Commit the verified contract.

**Gate:** every supported delivered key displays a meaningful value; blocking defaults does not swallow the play feedback; renderer cannot invoke unrestricted quit.

## Task 4: Build the playful key scene

**Owner:** Sol. **Files:** renderer HTML/main/CSS/scene, `tests/scene.test.ts`.

**Consumes:** `PlayKey`, `Settings`, bridge subscriptions. **Produces:** scene controller used by UI assembly.

```ts
export interface Scene {
  accept(key: PlayKey): void;
  setReducedMotion(enabled: boolean): void;
  clear(): void;
  dispose(): void;
}
export function createScene(root: HTMLElement): Scene;
```

- [ ] Add behavior tests for bounded recent-key history, held-key release, expiry, cleanup, and a 10,000-event synthetic burst that never exceeds nine live bubbles/64 particles. Inject time into internal scene-state helpers so tests do not wait in real time.
- [ ] Implement a stationary prominent newest glyph plus a short fading bubble trail. Use stable key colors, legible contrast, generous type, and restrained bounce. Keep type visible above any particles. Map Enter/Space/arrows/modifiers to friendly labels.
- [ ] Render immediately on input and animate with `requestAnimationFrame`; stop animation work when settled. No per-key accumulating intervals. Reduced motion uses static placement and opacity only.
- [ ] Build the parent setup and play views with no child-facing controls. Prevent context menus, drag/drop navigation, selection, and browser zoom paths during play.
- [ ] Run `npm test -- tests/scene.test.ts`. Inspect at normal and Retina scale, small/large window sizes in unlocked development, and packaged fullscreen. Smash multiple keys and verify the newest glyph remains readable. Measure event-to-frame latency on target hardware against the 100 ms target, then commit.

**Gate:** legible, engaging feedback with bounded resource use; screen settles when idle; no autoplay or accumulating decorations.

## Task 5: Add restrained sound and parent preferences

**Owner:** Sol. **Files:** `src/renderer/audio.ts`, `src/main/settings.ts`, parent UI integration, `tests/audio.test.ts`.

**Consumes:** `PlayKey`, `Settings`. **Produces:** persisted validated preferences and sound controller.

```ts
export interface Sound {
  accept(key: PlayKey): void;
  configure(settings: Settings): void;
  stop(): void;
  dispose(): void;
}
export function createSound(): Sound;
```

- [ ] Test scheduler behavior with a fake monotonic clock: muted events emit no tones; keyups emit none; no more than four active voices/eight starts per second; stop cancels sound; rejected events never queue for later.
- [ ] Implement short Web Audio tones selected deterministically by key; start/resume audio from the parent's Start gesture, with silent continuation if unavailable. Default sound enabled, app volume 0.15, reduced motion following the OS preference until explicitly overridden.
- [ ] Validate settings on both IPC and file load: sound/reducedMotion are booleans, volume is finite and clamped to 0–1; corrupt files fall back to defaults. Save only these preferences atomically under Electron userData.
- [ ] Wire parent controls, practice status, exit instructions, and co-play prompt. Mute stops active voices immediately; unlock/recovery stops audio and clears scene state.
- [ ] Run `npm test -- tests/audio.test.ts`, inspect settings persistence after relaunch, and listen during sustained smashing for overlap/loudness. Confirm offline operation. Commit.

**Gate:** sound stays bounded and controllable; settings work offline; no letter speech backlog or personal/key-history storage exists.

## Task 6: Package, integrate, and audit the actual app

**Owner:** Sol for packaging/integration; Astra for final containment review. **Files:** Forge config, `tests/app.e2e.ts`, `README.md`, `docs/kiosk-validation.md`.

**Consumes:** all previous tasks. **Produces:** local macOS `.app`/archive, test results, usage instructions, and explicit supported-configuration statement.

- [ ] Expose scripts `npm run dev`, `npm test`, `npm run typecheck`, `npm run test:e2e`, `npm run package`, and `npm run make` with template-compatible entry points. Release builds exclude spike timeouts and dev bypasses.
- [ ] Add Electron integration tests for parent practice → Start → key feedback → parent exit, settings, blocked navigation/new windows, and renderer replacement. Any test control hooks are development/test-only and absent in the release artifact.
- [ ] Run `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run make`. Expected: all pass and a launchable local macOS artifact exists. Automated integration tests do not establish OS shortcut containment.
- [ ] Run the full Task 1 physical escape matrix on the final packaged artifact, including display changes and sleep/wake. Repeat correct/incorrect unlock after a ten-minute smash session and after renderer crash/hang. Record every result; fix failures before release.
- [ ] Astra reviews the evidence, quit guards, unlock state machine, IPC surface, and recovery behavior. Escalate only findings that affect those boundaries; let Sol finish ordinary packaging/UI fixes.
- [ ] Document launch, Start, exit sequence, settings, offline behavior, exact tested configuration, and hardware/OS limits. Include artifact location. Public signing/notarization is a separate task if distribution is requested.
- [ ] Commit verified changes and hand over the local app with concise test evidence. Never label a failed or untested escape path as secure.

**Definition of done:** all four user requirements are represented in the packaged app, the parent exit works under stress, documented ordinary escape paths are blocked, key feedback stays clear and responsive, and the desktop returns to normal afterward.

## Planning self-review

- Desktop app: Tasks 1 and 6.
- Kiosk/parent escape: Tasks 1, 2, 3, and 6; hardware limits explicit in spec.
- Educational key feedback: Tasks 3 and 4.
- Engagement and evidence-informed restraint: Tasks 4 and 5; primary sources in spec.
- Future extension: separated input/scene/audio units; no unnecessary mode framework.
- Model assignments: explicit owner and review scope per task.
- No implementation or runtime checks were performed while writing this plan.
