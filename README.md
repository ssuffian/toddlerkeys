# Toddler Keys

A gentle, offline-friendly keyboard play space for young children.

Letters, numbers, and symbols create colorful play scenes. A recent-key row reinforces letter and number sequences, and parents can choose musical tones or spoken key names. Modifier and other control keys are ignored during play.

## Ways to play

- **Web/PWA:** [play at toddlerkeys.vercel.app](https://toddlerkeys.vercel.app), with installable best-effort fullscreen behavior.
- **Desktop apps:** [choose the right Mac or Linux install](https://toddlerkeys.vercel.app/download/). The macOS builds are signed and notarized by Apple, and Linux installs can update through APT.

## Development

```sh
npm ci
npm test
npm run typecheck
```

Run the browser version with `npm run build:web` and `npm run preview:web`. Run the Mac app locally with `npm start`.

Release and Apple signing setup are documented in [`docs/releasing.md`](docs/releasing.md).
For the strongest practical Mac containment, follow the one-time [`macOS kiosk setup`](docs/macos-kiosk-setup.md).

Lockdown mode prevents app-level exits and zooming. Operating-system shortcuts are outside an ordinary app's control; on Linux, desktop features such as screenshots may remain available and require a separately restricted OS session for complete kiosk containment.

## Publishing a new version

Apple credentials stay in the local Mac Keychain; GitHub does not store them.

1. Change `version` in `package.json` (for example, from `0.1.0` to `0.1.1`).
2. Commit and push the finished changes to `main`.
3. Publish either or both platforms when they are ready:

   ```sh
   npm run publish:mac
   npm run publish:linux
   ```

The commands are independent and may run on different schedules while sharing the same version and GitHub release. The Mac command builds and notarizes both Mac architectures. The Linux command builds x64 and ARM64 Debian installers and publishes the signed APT repository. The website's [download page](https://toddlerkeys.vercel.app/download/) provides the update-enabled Linux setup as well as direct downloads.
