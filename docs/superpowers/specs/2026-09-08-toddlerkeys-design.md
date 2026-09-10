# Toddler Keys proposed design

Status: design approved for implementation on 2026-09-08. Initial platform: macOS. Implementation and verification status are tracked in `docs/implementation-progress.md`; this design is not a claim that kiosk acceptance has passed.

## Product

A locally installed, offline keyboard-smash toy. Each delivered key produces a large, recognizable character or key label and a playful response. A parent starts a protected play session and ends it through a deliberate keyboard sequence. Initial educational scope is cause-and-effect and key familiarity, not a claim of literacy instruction.

## Approach options

| Approach | Tradeoff | Decision |
| --- | --- | --- |
| Electron + TypeScript | Fast visual iteration, packaged desktop app, existing macOS kiosk restrictions; behavior must be verified on the chosen release | Recommended |
| Native Swift/AppKit | Direct macOS integration and a smaller runtime; more platform-specific work and no automatic guarantee of stronger containment | Fallback if the kiosk spike finds an addressable Electron limitation |
| Browser/PWA | Simple delivery but inadequate control over browser and OS escape paths | Does not meet the requirement |

Electron currently applies AppKit presentation restrictions for kiosk mode, including process switching and the Force Quit panel. A native keyboard hook is not a default dependency. Inspect the pinned release and test it before deciding whether native code is necessary. [Electron API](https://www.electronjs.org/docs/latest/api/browser-window), [macOS implementation](https://github.com/electron/electron/blob/main/shell/browser/native_window_mac.mm).

## Parent and child flows

1. Launch to a normal parent setup window with sound, volume, reduced-motion, and Lockdown mode controls. Lockdown defaults off. Show the parent exit sequence and require one successful practice before enabling Start on that launch.
2. Start enters kiosk on the primary display. Secondary displays get noninteractive covering windows; display changes refresh coverage. This behavior is a release gate, not an assumed consequence of one fullscreen window.
3. The play screen has no exit/settings buttons, links, menus, text inputs, or dialogs. Pointer clicks may make a small ripple but never navigate or alter settings.
4. Exit: when Lockdown mode is off, **Escape** returns immediately to setup. Hold **Control + Shift + K for two seconds** in either mode. Successful completion returns immediately to setup. Any extra key or modifier, an early release, or an input discontinuity resets the chord attempt. Key autorepeat never advances the sequence. This is a toddler barrier, not authentication against an adult.
   The parent setup screen displays a live progress bar and countdown during the hold. Recognition starts from K's modifier flags so it remains reliable when macOS/Electron does not deliver separate modifier key-down events to the window.
5. Successful exit stops audio and animation, removes display covers, restores normal window behavior, and returns to parent setup, where Quit is available.

The final chord is subject to real-keyboard testing. Physical keyboard rollover can limit what simultaneous keys the OS receives.

## Kiosk requirement and limits

Release target: ordinary keyboard, mouse, and trackpad interactions cannot expose other apps or leave a healthy play session on the tested macOS configuration. Test Command-Q/W/H/M/Tab, Command-Option-Escape, Escape, fullscreen shortcuts, Spotlight, Mission Control, Spaces gestures, hot corners, media/function keys, screen edges, sleep/wake, and multiple displays.

An ordinary app cannot promise resistance to hardware power-off, OS failure, or privileged termination. Apple explicitly supports force shutdown via the power button. These are outside the containment contract. [Apple power controls](https://support.apple.com/en-nz/guide/mac-help/mchlp2522/mac).

Do not silently downgrade to ordinary fullscreen if a required escape test fails. Resolve the gap or revise the supported configuration before calling the app toddler-contained. Windows requires its own feasibility decision and acceptance matrix; it is not included in the initial guarantee.

Main process owns kiosk state, close/quit guards, exit recognition, and window recovery. Development runs start unlocked. A renderer crash should trigger replacement inside the protected session. A renderer hang requires a bounded recovery attempt; verify that the exit still works afterward. A main-process crash may end containment and must not be described as covered.

## Visual and sound behavior

- Warm, uncluttered background; giant high-contrast key glyph inside a softly bouncing colored bubble. Key identity is always more prominent than decoration.
- Stable color selection by key. Newest glyph remains in a fixed prominent position; up to eight older bubbles fade within two seconds. When idle, movement settles and the latest glyph stays visible.
- Show actual delivered printable characters, including shifted symbols. Show friendly labels/symbols for Space, Enter, Tab, Backspace, Escape, arrows, and modifiers. Never display `undefined` or raw browser event names.
- Every distinct delivered keydown responds; OS autorepeat creates no additional bubble or sound. Multiple held keys remain representable. Do not promise events for hardware/system keys the OS withholds.
- Target visible feedback within 100 ms on the tested Mac. Bound live bubbles to nine and decorative particles to 64. These are engineering defaults, not research-prescribed values.
- Soft synthesized tones are optional, initially on at low app gain, with parent instrument, mute, and volume controls. Instrument choices are Marimba, Piano, Bells, and Soft Synth; changing the selection plays a short preview. Maximum four concurrent voices and eight tone starts per second. No background music or queued speech. Software volume does not set the physical speaker's acoustic output.
- Reduced motion uses static glyph updates and gentle opacity changes. Avoid flashes and screen shake.
- No points, streaks, failure states, surprise reward schedules, or calls to keep playing. Idle remains quiet.
- Parent setup includes one co-play suggestion: “You pressed B. Can we find B on the keyboard?”

NAEYC supports active exploration and adult co-play; ZERO TO THREE recommends interactivity that reinforces the learning goal without distracting embellishments. The visual choices above are design inferences from that guidance. [NAEYC](https://www.naeyc.org/resources/topics/technology-and-media/infants-and-toddlers), [ZERO TO THREE](https://www.zerotothree.org/resource/screen-use-tips-for-parents-of-children-under-three/).

Evidence for toddlers learning from contingent screen feedback is mixed and age-dependent. The app should not imply demonstrated alphabet learning. [Primary research](https://pmc.ncbi.nlm.nih.gov/articles/PMC7943612/). Avoiding excessive reward loops also follows the AAP's quality concerns. [AAP policy](https://publications.aap.org/pediatrics/article/157/2/e2025075320/206129/Digital-Ecosystems-Children-and-Adolescents-Policy).

## Architecture

Electron main process → validated preload bridge → TypeScript renderer. Use Vite for renderer tooling and Electron Forge for packaging; plain DOM/CSS and a small Canvas particle layer suffice without React or a game engine.

Main process intercepts play-session keyboard input through `before-input-event`, recognizes the parent sequence, prevents page/menu default handling, and explicitly forwards normalized play events. Preventing the event also suppresses renderer delivery, so the bridge is necessary. This is not a universal OS shortcut interception API. [Electron input events](https://www.electronjs.org/docs/latest/api/web-contents#event-before-input-event).

Security baseline: local assets only; no accounts, network services, telemetry, or stored key history; `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`; restrictive CSP; deny navigation and new windows; release DevTools disabled. IPC exposes only typed subscriptions and parent setup actions, with sender and session-state validation. There is no renderer-callable unrestricted quit method. [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security).

Keep key normalization, unlock recognition, scene state, and audio scheduling separate. This provides extension points for later spoken letters, numbers, shapes, and themed play without creating a plugin system now. Persist only validated parent sound/motion settings.

## Release definition

A packaged macOS app launches offline, teaches the parent exit procedure, contains the documented ordinary escape paths, displays delivered keys legibly during sustained smashing, respects mute/reduced motion, survives renderer recovery, and restores desktop controls on parent exit. Record macOS, Electron, hardware, keyboard, and display configuration with each manual kiosk result. An untested row is not a pass.

Speech, quizzes, words, profiles, progress tracking, Windows support, automatic updates, and public distribution/signing are outside v1. Local packaging is included; signing/notarization becomes a separate delivery task if the user wants to distribute it.
