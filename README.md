# Toddler Keys

A gentle, offline-friendly keyboard play space for young children.

## Ways to play

- **Web/PWA:** [play at toddlerkeys.vercel.app](https://toddlerkeys.vercel.app), with installable best-effort fullscreen behavior.
- **Desktop apps:** [download macOS and Linux builds from GitHub Releases](https://github.com/ssuffian/toddlerkeys/releases). The macOS builds are signed and notarized by Apple.

## Development

```sh
npm ci
npm test
npm run typecheck
```

Run the browser version with `npm run build:web` and `npm run preview:web`. Run the Mac app locally with `npm start`.

Release and Apple signing setup are documented in [`docs/releasing.md`](docs/releasing.md).
For the strongest practical Mac containment, follow the one-time [`macOS kiosk setup`](docs/macos-kiosk-setup.md).

## Publishing a new version

Apple credentials stay in the local Mac Keychain; GitHub does not store them.

1. Change `version` in `package.json` (for example, from `0.1.0` to `0.1.1`).
2. Commit and push the finished changes to `main`.
3. Run `npm run publish:mac` on the configured Mac.

That command tests the app, builds and notarizes both Mac versions, and creates the GitHub release. Publishing the release automatically triggers GitHub to build Linux x64 and ARM64 ZIPs and attach them to the same release. Downloads then appear on the [GitHub Releases page](https://github.com/ssuffian/toddlerkeys/releases), which is also linked from the website.
