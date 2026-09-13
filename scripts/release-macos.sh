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

export MACOS_SIGN_IDENTITY="$signing_identity"
export MACOS_NOTARY_PROFILE="$notary_profile"

npm test
npm run typecheck
npm run make:mac -- --arch=arm64
npm run make:mac -- --arch=x64

print "Signed and notarized downloads are in out/make/zip/darwin/."
