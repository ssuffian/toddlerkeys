#!/bin/zsh

set -euo pipefail

./scripts/release-macos.sh

readonly version="$(node -p "require('./package.json').version")"
readonly tag="v${version}"
artifacts=(
  "out/make/dmg/darwin/arm64/Toddler-Keys-macOS-Apple-Silicon.dmg"
  "out/make/dmg/darwin/x64/Toddler-Keys-macOS-Intel.dmg"
  "out/make/zip/darwin/arm64/Toddler-Keys-macOS-Apple-Silicon.zip"
  "out/make/zip/darwin/x64/Toddler-Keys-macOS-Intel.zip"
)

gh release create "$tag" "${artifacts[@]}" --generate-notes --title "Toddler Keys ${tag}"

print "Published ${tag} at https://github.com/ssuffian/toddlerkeys/releases"
