# Implementation progress

Plan: `docs/superpowers/plans/2026-09-08-toddlerkeys.md`

User approved implementation on 2026-09-08, including direct delegation to Sol.

## Rulings

- Work in this newly created repository on `feat/toddlerkeys`; there is no pre-existing code or branch to isolate.
- Build and validate all software that can be tested here. Hardware gestures, sleep, and display changes requiring physical access remain explicit manual acceptance items. Do not describe automated event injection as proof of OS containment. This avoids blocking reversible implementation on unavailable physical actions while preserving the release claim boundary.
- Foundation tasks 1/2 share lifecycle/window ownership and are one Astra implementation batch, reviewed before Sol renderer integration.
- Keep runtime app assets offline. Development tooling may fetch dependencies.

## Preflight

| Tasks | Shared surface | Finding / resolution |
| --- | --- | --- |
| 1 / 2 | main, windows | Batch as foundation; replace spike-only exit controls before packaged delivery |
| 1 / 3 | main, preload | Foundation establishes bridge; Task 3 completes normalization and validates trust boundaries |
| 1 / 4 | renderer entry | Foundation supplies minimal setup; renderer agent replaces presentation while preserving contract |
| 1 / 6 | config, package | Pin installed versions; final packaging uses same tested source |
| 2 / 3 | PhysicalInput, session | Define once in shared contracts; unlock is main-owned |
| 2 / 4 | state notifications | Renderer clears on setup/recovery; initial snapshot needed to avoid subscription races |
| 2 / 5 | settings, recovery | Reject preferences while playing; stop audio on session transitions |
| 2 / 6 | recovery, physical validation | Automated recovery evidence separate from physical containment evidence |
| 3 / 4 | PlayKey, preload | Typed events; repeat filtered before forwarding; keyup preserved |
| 3 / 5 | Settings, bridge | Main validates persistence and IPC; renderer owns sound |
| 3 / 6 | entry, IPC tests | Release has no unrestricted quit or test bypass |
| 4 / 5 | renderer entry | Sequential implementations to prevent merge conflicts |
| 4 / 6 | scene tests | Performance target measured separately from resource-bound tests |
| 5 / 6 | settings/audio | Offline and persistence integration checks |
| 1 | own requirements | Physical gate is a delivery claim gate; unexercised items documented |
| 2 | own requirements | Need recognizer progress snapshot for clear practice UI; add typed status |
| 3 | own requirements | Shared PhysicalInput lives in contracts, not duplicate declarations |
| 4 | own requirements | Bounded scene state independently testable |
| 5 | own requirements | OS reduced-motion default requires distinguishing absent persisted setting |
| 6 | own requirements | Automated integration is not OS shortcut evidence |

## Status

- Foundation: in progress.
- Input/bridge: pending.
- Scene: pending.
- Audio/preferences: pending.
- Packaging/review: pending.
