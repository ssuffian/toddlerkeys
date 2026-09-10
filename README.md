# Toddler Keys

A gentle, offline-friendly keyboard play space for young children.

## Ways to play

- **Web/PWA:** [play at toddlerkeys.vercel.app](https://toddlerkeys.vercel.app), with installable best-effort fullscreen behavior.
- **macOS app:** [download from GitHub Releases](https://github.com/ssuffian/toddlerkeys/releases) after the first signed release is published.

## Development

```sh
npm ci
npm test
npm run typecheck
```

Run the browser version with `npm run build:web` and `npm run preview:web`. Run the Mac app locally with `npm start`.

Release and Apple signing setup are documented in [`docs/releasing.md`](docs/releasing.md).
