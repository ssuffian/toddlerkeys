# Toddler Keys

A gentle, offline-friendly keyboard play space for young children.

## Ways to play

- **Web/PWA:** installable from the browser, with best-effort fullscreen behavior.
- **macOS app:** downloadable Electron build with stronger kiosk containment.

## Development

```sh
npm ci
npm test
npm run typecheck
```

Run the browser version with `npm run build:web` and `npm run preview:web`. Run the Mac app locally with `npm start`.

Release and Apple signing setup are documented in [`docs/releasing.md`](docs/releasing.md).
