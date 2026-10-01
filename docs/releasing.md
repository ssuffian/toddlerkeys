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

Run `npm run release:mac` to test, build, sign, and notarize Apple silicon and Intel DMG downloads locally. It also produces ZIP fallbacks. The DMGs contain an Applications shortcut for the familiar drag-to-install flow, and both the app and final disk image are notarized and stapled.

For a new Mac release, bump the version in `package.json`, commit and push the changes, then run `npm run publish:mac`. It checks GitHub publishing access before building, then uploads both DMGs and both ZIP fallbacks to the shared GitHub Release. The release tag comes from the `version` in `package.json`. It does not start a Linux build.

Mac and Linux use the same code version and GitHub release, but publish independently. Either platform can publish first; the other adds its downloads to that release later. Running a platform command again replaces only that platform's files.

GitHub CLI (`gh`) must use an account with write access to `ssuffian/toddlerkeys`. Use `gh auth switch -h github.com -u ssuffian` to select the owner account. If the permission check asks for `workflow`, run `gh auth refresh -h github.com -s workflow` and approve in the browser while signed into that same account.

If building succeeded but uploading failed, fix the authentication or network issue, then run `npm run publish:mac -- --upload-only`. This reuses the existing downloads without rebuilding or notarizing again, and resumes an incomplete draft release if one exists. The ZIP app versions must match `package.json`; rebuild after bumping the version.

The release script explicitly refuses the Why Not Prosper team ID (`NGV7NNRRL2`) and will stop if personal team selection is ambiguous.

## Linux downloads and automatic updates

Run `npm run publish:linux` whenever the Linux version is ready. The GitHub workflow builds installable Debian packages for x64 PCs and ARM64 machines, attaches both to the shared release, and publishes the signed APT repository to GitHub Pages. It does not build or alter the Mac downloads. If Linux publishes first, the workflow creates the version tag and shared release from the current `main`; a later Mac publish adds its files. Installing the package registers the Toddler Keys launcher and icon with the desktop and preserves Electron's Linux sandbox helper permissions. Linux builds do not use the Apple certificate or notarization credentials.

The repository signing key lives in the `APT_SIGNING_KEY` GitHub Actions secret. Its public half is committed at `packaging/apt/toddlerkeys-archive-keyring.gpg`. Keep that secret and public key together: replacing only one will make published repository metadata unverifiable. The release workflow requires GitHub Pages to use **GitHub Actions** as its build source.

Users add `https://ssuffian.github.io/toddlerkeys` once using the commands on the download page. After that, `apt upgrade` and graphical Ubuntu/Debian software updaters discover new Toddler Keys releases normally.

Release assets use stable names so `/download/` can link straight to the latest files without exposing the GitHub Releases interface. Keep those names in sync between the release scripts, Linux workflow, and download page.

To rebuild Linux and republish the APT repository for the version in `package.json`, run `npm run publish:linux`. You can also open **Actions > Release Linux app > Run workflow** and enter the current tag, such as `v0.1.4`. Locally, `npm run make:linux -- --arch=x64` runs the same Forge build when executed on Linux. `scripts/build-apt-repository.sh` can reproduce the repository layout on a machine with `dpkg-scanpackages` and GnuPG installed.

Never put certificate files, passwords, or Apple credentials in this repository.
