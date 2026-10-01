#!/bin/zsh

set -euo pipefail

upload_only=false
case "${1:-}" in
  "") ;;
  --upload-only) upload_only=true ;;
  *) print -u2 "Usage: npm run publish:mac -- [--upload-only]"; exit 1 ;;
esac
if (( $# > 1 )); then
  print -u2 "Usage: npm run publish:mac -- [--upload-only]"
  exit 1
fi

readonly repo="ssuffian/toddlerkeys"
readonly version="$(node -p "require('./package.json').version")"
readonly tag="v${version}"

# Check publishing access before spending time building and notarizing.
if ! repo_access="$(gh api --include "repos/${repo}" --jq '.permissions.push')"; then
  print -u2 "Cannot access ${repo}. Check gh auth status before retrying."
  exit 1
fi
if [[ "${repo_access##*$'\n'}" != "true" ]]; then
  print -u2 "The active GitHub account cannot publish to ${repo}."
  print -u2 "Run: gh auth switch -h github.com -u ssuffian"
  exit 1
fi
oauth_scopes="$(print -r -- "$repo_access" | awk 'tolower($1) == "x-oauth-scopes:" { $1=""; print }')"
# Fine-grained tokens do not return the OAuth scopes header.
if [[ -n "$oauth_scopes" && ",$oauth_scopes," != *workflow* ]]; then
  print -u2 "GitHub authorization needs the workflow permission before publishing."
  print -u2 "Run: gh auth refresh -h github.com -s workflow"
  print -u2 "Approve in the browser using the same account as gh auth status."
  exit 1
fi

existing_release="$(gh release view "$tag" --repo "$repo" --json isDraft --jq '.isDraft' 2>/dev/null || true)"

if [[ "$upload_only" == "false" ]]; then
  ./scripts/release-macos.sh
fi

artifacts=(
  "out/make/dmg/darwin/arm64/Toddler-Keys-macOS-Apple-Silicon.dmg"
  "out/make/dmg/darwin/x64/Toddler-Keys-macOS-Intel.dmg"
  "out/make/zip/darwin/arm64/Toddler-Keys-macOS-Apple-Silicon.zip"
  "out/make/zip/darwin/x64/Toddler-Keys-macOS-Intel.zip"
)

for artifact in "${artifacts[@]}"; do
  if [[ ! -s "$artifact" ]]; then
    print -u2 "Missing download: ${artifact}. Run npm run release:mac first."
    exit 1
  fi
done

# Stable filenames can survive a version bump; don't upload an older app.
for zip_path in "${artifacts[3]}" "${artifacts[4]}"; do
  artifact_version="$(unzip -p "$zip_path" 'Toddler Keys.app/Contents/Info.plist' | plutil -extract CFBundleShortVersionString raw -o - -)"
  if [[ "$artifact_version" != "$version" ]]; then
    print -u2 "${zip_path} is version ${artifact_version}, expected ${version}. Rebuild with npm run release:mac."
    exit 1
  fi
done

print "Uploading ${tag}. If uploading fails, retry without rebuilding:"
print "  npm run publish:mac -- --upload-only"

if [[ -n "$existing_release" ]]; then
  print "Adding Mac downloads to the existing shared ${tag} release."
  gh release upload "$tag" "${artifacts[@]}" --repo "$repo" --clobber
  if [[ "$existing_release" == "true" ]]; then
    gh release edit "$tag" --repo "$repo" --draft=false
  fi
else
  gh release create "$tag" "${artifacts[@]}" --repo "$repo" --generate-notes --title "Toddler Keys ${tag}"
fi

print "Published ${tag} at https://github.com/${repo}/releases"
