# Stronger macOS kiosk setup

Toddler Keys uses Electron kiosk mode, stays above ordinary windows, covers every connected display, and reclaims focus if another app becomes active. The app is also pinned to every macOS Space while play is active.

macOS still owns system gestures, hot corners, and global shortcuts registered by other applications. A normal desktop app cannot reliably disable those controls. Configure the Mac before handing it to a child:

## Trackpad

Open **System Settings > Trackpad > More Gestures** and turn off:

- Swipe between full-screen applications
- Mission Control
- App Exposé
- Show Desktop
- Notification Centre

## Keyboard and screen corners

Open **System Settings > Keyboard > Keyboard Shortcuts**. Under **Mission Control** and **Spotlight**, disable shortcuts that can switch Spaces or open system overlays.

Open **System Settings > Desktop & Dock > Hot Corners** and set every corner to `—`.

## Other applications

Quit applications with system-wide launchers before play. For Claude Desktop, open **Settings > General > Desktop App** and disable both the quick-access and voice shortcuts. Claude's default quick-access shortcut is a double press of the Option key, and Toddler Keys cannot reliably intercept a shortcut owned by another application.

For better separation from personal files and login items, use a dedicated standard macOS user account for the child and do not launch background utilities in that account.

These steps provide stronger practical containment, not a security boundary. Enforced single-app use on managed Macs requires an MDM configuration such as Apple's Autonomous Single App Mode.
