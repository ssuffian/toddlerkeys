# Kiosk validation results

## 2026-09-13 — macOS workspace hardening

- System: macOS 26.6.2 (Build 25G83), Apple silicon
- Runtime: Electron 44.2.0 development build
- Input: Mac trackpad and keyboard
- Displays: not recorded during this focused retest

| Attempt | Result | Notes |
| --- | --- | --- |
| Swipe to another Space | Pass | The play session stayed visible after pinning the primary kiosk window to every Space and reclaiming focus. |
| Double-press Option with Claude Desktop running | External escape remains | Claude Quick Entry appeared. This is a system-wide shortcut owned by Claude and is outside Electron's reliable input interception. Disable Claude's quick-access shortcut or quit Claude before play. |

Only the two reported escape paths were checked in this focused retest. The remaining items in [`manual-kiosk-check.md`](manual-kiosk-check.md) still require physical acceptance testing on the intended machine.
