# Releasing Toddler Keys

## Browser/PWA

`npm run build:web` produces the static site in `dist/`. It includes the web app manifest, offline service worker, and install icons. The browser version uses fullscreen and Keyboard Lock when available, but it does not claim OS-level containment.

The repository includes `vercel.json`, so importing it into Vercel or running `vercel --prod` uses the correct build command and publishes `dist/`. Keep the service worker and manifest cache headers in that configuration so updates are discovered promptly.

## Signed macOS downloads

Releases are signed and notarized locally, using the Apple credentials in your Mac Keychain. GitHub does not need any Apple secrets.

### One-time Apple setup

1. In Xcode, open **Settings > Accounts** and select your personal paid Apple Developer team.
2. Choose **Manage Certificates**, then **+ > Developer ID Application**.
3. Check the installed identity and note its team ID:

   ```sh
   security find-identity -v -p codesigning
   ```

4. Store the personal notarization credentials in Keychain, replacing the placeholders with the personal account and the team ID from that certificate:

   ```sh
   xcrun notarytool store-credentials "toddlerkeys-notary-PERSONAL_TEAM_ID" \
     --apple-id "PERSONAL_APPLE_ID" \
     --team-id "PERSONAL_TEAM_ID"
   ```

   The command securely prompts for an app-specific password and validates the credentials.

### Build or publish

Run `npm run release:mac` to test, build, sign, and notarize Apple silicon and Intel ZIP downloads locally.

Run `npm run publish:mac` to do the same and upload both ZIPs to a GitHub Release. This requires the GitHub CLI (`gh`) to be signed in. The release tag comes from the `version` in `package.json`.

The release script explicitly refuses the Why Not Prosper team ID (`NGV7NNRRL2`) and will stop if personal team selection is ambiguous.

Never put certificate files, passwords, or Apple credentials in this repository.
