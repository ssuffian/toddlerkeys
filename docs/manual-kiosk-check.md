# Physical kiosk acceptance check

Run this checklist on the packaged app, with an adult at the keyboard. Automated app tests do not replace these checks. Record results in `kiosk-validation.md` with the macOS/Electron version, keyboard, trackpad/mouse, and display setup.

First leave Lockdown mode off. Practice the parent exit in the normal setup window: hold Command + Option + K for two seconds. The app must acknowledge successful practice and enable Start. Start play only when you can repeat this reliably.

For each escape attempt below, pass means the play session stays visible and other apps remain inaccessible. If anything exposes the desktop, another app, or an OS action panel, record the exact action and stop calling that configuration contained.

| Attempt | Expected behavior |
| --- | --- |
| Escape with Lockdown off | Immediately returns to setup |
| Escape with Lockdown on; Command-Q, Command-W | No close or exit |
| Command-H, Command-M, Option-Command-H | No hide or minimize |
| Command-Tab and Command-Shift-Tab | No access to another app |
| Command-Option-Escape | No accessible Force Quit panel |
| Control-Command-F | No exit from kiosk |
| Command-Space and keyboard launcher shortcuts | No launcher overlay or app switch |
| Mission Control key and trackpad gesture | No desktop/window switching |
| Control-arrow and Spaces swipe gestures | No other Space |
| Enabled hot corners | No desktop, lock, or launcher action |
| Pointer at all screen edges; right-click | No Dock/menu/context-menu escape |
| Media/Fn keys and Fn globe shortcuts | Record every visible OS action; do not assume these are ordinary key events |
| Connect/disconnect a second display | No uncovered usable desktop; play input and parent exit still work |
| Click each connected display | No focus-related escape or lost parent exit |
| Close/open lid; sleep/wake | Record behavior; verify session coverage and exit after wake |
| Disconnect/reconnect external keyboard | No stale partial unlock; a fresh parent sequence works |
| Hold one key; mash several keys for ten minutes | No unbounded bubbles/audio, hung window, or accidental exit |
| Hold exit chord for less than two seconds | Remains playing |
| Press Shift, Control, or another key during the chord | Attempt resets; remains playing |
| Hold the exact chord for two seconds | Returns to setup; normal Command-Tab, Quit, Dock, and menus work again |

Hardware forced shutdown and privileged process termination are outside an ordinary app's containment contract. Do not test forced shutdown as part of this checklist; it can interrupt unrelated work.

Renderer crash/hang recovery is exercised by the development integration suite. Test hooks must not exist in the packaged release. A main-process crash is not covered by renderer recovery.
