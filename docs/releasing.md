# Releasing Toddler Keys

## Browser/PWA

`npm run build:web` produces the static site in `dist/`. It includes the web app manifest, offline service worker, and install icons. The browser version uses fullscreen and Keyboard Lock when available, but it does not claim OS-level containment.

The repository includes `vercel.json`, so importing it into Vercel or running `vercel --prod` uses the correct build command and publishes `dist/`. Keep the service worker and manifest cache headers in that configuration so updates are discovered promptly.

## Signed macOS downloads

The release workflow builds separate Apple silicon (`arm64`) and Intel (`x64`) ZIP downloads. Add these encrypted GitHub Actions repository secrets before running it:

- `MACOS_CERTIFICATE_BASE64`: exported Developer ID Application `.p12`, base64 encoded
- `MACOS_CERTIFICATE_PASSWORD`: password used when exporting that certificate
- `MACOS_SIGN_IDENTITY`: full certificate name, such as `Developer ID Application: Your Name (TEAMID)`
- `APPLE_ID`: Apple Developer account email
- `APPLE_APP_SPECIFIC_PASSWORD`: app-specific password for notarization
- `APPLE_TEAM_ID`: Apple Developer team ID
- `CI_KEYCHAIN_PASSWORD`: a random password used only for the temporary CI keychain

Push a version tag such as `v0.1.0`, or run **Release macOS app** manually from GitHub Actions. Tagged builds are attached to the matching GitHub release after signing and notarization.

Never put certificate files, passwords, or Apple credentials in this repository.
