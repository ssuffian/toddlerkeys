#!/bin/zsh

set -euo pipefail

readonly BLOCKED_TEAM_ID="NGV7NNRRL2"

all_identities=("${(@f)$(security find-identity -v -p codesigning | sed -n 's/.*"\(Developer ID Application:.*\)".*/\1/p')}")
identities=()
for identity in "${all_identities[@]}"; do
  if [[ -n "$identity" && "$identity" != *"(${BLOCKED_TEAM_ID})" ]]; then
    identities+=("$identity")
  fi
done

if (( ${#identities[@]} == 0 )); then
  print -u2 "No personal Developer ID Application certificate was found."
  print -u2 "In Xcode, open Settings > Accounts, select your personal paid team,"
  print -u2 "then Manage Certificates > + > Developer ID Application."
  exit 1
fi

if (( ${#identities[@]} > 1 )); then
  print -u2 "More than one non-Why Not Prosper Developer ID Application certificate was found:"
  printf '  %s\n' "${identities[@]}" >&2
  print -u2 "Remove or revoke the unused identity before releasing so team selection is unambiguous."
  exit 1
fi

readonly signing_identity="${identities[1]}"
readonly team_id="$(print -r -- "$signing_identity" | sed -n 's/.*(\([A-Z0-9]*\))$/\1/p')"

if [[ -z "$team_id" || "$team_id" == "$BLOCKED_TEAM_ID" ]]; then
  print -u2 "Refusing to release with the Why Not Prosper team or an unknown team."
  exit 1
fi

readonly notary_profile="toddlerkeys-notary-${team_id}"

print "Signing as: ${signing_identity}"
print "Notarizing with Keychain profile: ${notary_profile}"

if ! xcrun notarytool history --keychain-profile "$notary_profile" >/dev/null 2>&1; then
  print -u2 "The personal notarization profile is not ready. Run this once:"
  print -u2 "  xcrun notarytool store-credentials '${notary_profile}' --apple-id 'YOUR_PERSONAL_APPLE_ID' --team-id '${team_id}'"
  exit 1
fi

# Package first, then sign the final bytes below. This avoids Forge signing
# before its remaining package-time mutations and removes a redundant call to
# Apple's timestamp service.
unset MACOS_SIGN_IDENTITY
unset MACOS_NOTARY_PROFILE

readonly version="$(node -p "require('./package.json').version")"
readonly entitlements="assets/entitlements.mac.plist"

build_release() {
  local arch="$1"
  local app_path="out/Toddler Keys-darwin-${arch}/Toddler Keys.app"
  local artifact_dir="out/make/zip/darwin/${arch}"
  local artifact_path="${artifact_dir}/Toddler Keys-darwin-${arch}-${version}.zip"
  local notary_dir
  local verify_dir

  npm run make:mac -- --arch="$arch"

  # Forge's fuse pass can mutate the executable after its first signature.
  # Re-sign the final bundle, then notarize exactly those final bytes.
  codesign --force --deep --options runtime --timestamp \
    --entitlements "$entitlements" \
    --sign "$signing_identity" \
    "$app_path"
  codesign --verify --deep --strict --verbose=4 "$app_path"

  notary_dir="$(mktemp -d "/tmp/toddlerkeys-notary-${arch}.XXXXXX")"
  ditto -c -k --sequesterRsrc --keepParent "$app_path" "${notary_dir}/Toddler-Keys.zip"
  xcrun notarytool submit "${notary_dir}/Toddler-Keys.zip" \
    --keychain-profile "$notary_profile" \
    --wait
  xcrun stapler staple "$app_path"
  xcrun stapler validate "$app_path"
  spctl --assess --type execute --verbose=4 "$app_path"

  mkdir -p "$artifact_dir"
  rm -f "$artifact_path"
  ditto -c -k --sequesterRsrc --keepParent "$app_path" "$artifact_path"

  verify_dir="$(mktemp -d "/tmp/toddlerkeys-verify-${arch}.XXXXXX")"
  ditto -x -k "$artifact_path" "$verify_dir"
  codesign --verify --deep --strict --verbose=4 "${verify_dir}/Toddler Keys.app"
  spctl --assess --type execute --verbose=4 "${verify_dir}/Toddler Keys.app"
}

npm test
npm run typecheck
build_release arm64
build_release x64

print "Signed and notarized downloads are in out/make/zip/darwin/."
