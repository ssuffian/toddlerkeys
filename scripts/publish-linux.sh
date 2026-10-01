#!/usr/bin/env bash

set -euo pipefail

repo="ssuffian/toddlerkeys"
version=$(node -p "require('./package.json').version")
tag="v${version}"

if ! gh api "repos/${repo}" --jq '.permissions.push' | grep -qx true; then
  echo "The active GitHub account cannot publish to ${repo}." >&2
  echo "Run: gh auth switch -h github.com -u ssuffian" >&2
  exit 1
fi

echo "Starting Linux ${tag}. This publishes only the DEB files and APT repository."
gh workflow run release-linux.yml --repo "$repo" -f "tag=${tag}"
echo "Watch it at https://github.com/${repo}/actions/workflows/release-linux.yml"
