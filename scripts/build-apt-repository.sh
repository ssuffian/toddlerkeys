#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: $0 <deb-directory> <output-directory> <public-key>" >&2
  exit 2
fi

deb_directory=$1
repository_directory=$2
public_key=$3

for command in dpkg-deb dpkg-scanpackages gpg md5sum sha1sum sha256sum sha512sum; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing required command: $command" >&2
    exit 1
  fi
done

if [[ -z "$repository_directory" || "$repository_directory" == "/" ]]; then
  echo "Refusing unsafe repository output directory" >&2
  exit 1
fi

amd64_package="$deb_directory/Toddler-Keys-Linux-x64.deb"
arm64_package="$deb_directory/Toddler-Keys-Linux-arm64.deb"

for package in "$amd64_package" "$arm64_package"; do
  if [[ ! -f "$package" ]]; then
    echo "Missing package: $package" >&2
    exit 1
  fi
done

rm -rf "$repository_directory"
mkdir -p \
  "$repository_directory/pool/main/t/toddlerkeys" \
  "$repository_directory/dists/stable/main/binary-amd64" \
  "$repository_directory/dists/stable/main/binary-arm64"

copy_package() {
  local source_package=$1
  local expected_architecture=$2
  local package_name package_version package_architecture

  package_name=$(dpkg-deb --field "$source_package" Package)
  package_version=$(dpkg-deb --field "$source_package" Version)
  package_architecture=$(dpkg-deb --field "$source_package" Architecture)

  if [[ "$package_name" != "toddlerkeys" ]]; then
    echo "Unexpected package name in $source_package: $package_name" >&2
    exit 1
  fi
  if [[ "$package_architecture" != "$expected_architecture" ]]; then
    echo "Unexpected architecture in $source_package: $package_architecture" >&2
    exit 1
  fi

  cp "$source_package" \
    "$repository_directory/pool/main/t/toddlerkeys/toddlerkeys_${package_version}_${package_architecture}.deb"
}

copy_package "$amd64_package" amd64
copy_package "$arm64_package" arm64
cp "$public_key" "$repository_directory/toddlerkeys-archive-keyring.gpg"
touch "$repository_directory/.nojekyll"

for architecture in amd64 arm64; do
  package_index="$repository_directory/dists/stable/main/binary-$architecture/Packages"
  (
    cd "$repository_directory"
    dpkg-scanpackages --arch "$architecture" pool /dev/null > "${package_index#"$repository_directory/"}"
  )
  gzip -9 -c "$package_index" > "$package_index.gz"
done

cat > "$repository_directory/index.html" <<'EOF'
<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Toddler Keys package repository</title></head>
  <body><h1>Toddler Keys package repository</h1><p>Installation instructions are available on the <a href="https://toddlerkeys.vercel.app/download/">Toddler Keys download page</a>.</p></body>
</html>
EOF

release_directory="$repository_directory/dists/stable"
release_file="$release_directory/Release"
cat > "$release_file" <<EOF
Origin: Toddler Keys
Label: Toddler Keys
Suite: stable
Codename: stable
Date: $(date -Ru)
Architectures: amd64 arm64
Components: main
Description: Toddler Keys packages
EOF

for checksum in \
  "MD5Sum md5sum" \
  "SHA1 sha1sum" \
  "SHA256 sha256sum" \
  "SHA512 sha512sum"; do
  read -r heading checksum_command <<< "$checksum"
  echo "$heading:" >> "$release_file"
  while IFS= read -r file; do
    relative_file=${file#"$release_directory/"}
    digest=$($checksum_command "$file" | cut -d ' ' -f 1)
    size=$(stat --format='%s' "$file")
    printf ' %s %16s %s\n' "$digest" "$size" "$relative_file" >> "$release_file"
  done < <(find "$release_directory/main" -type f -print | sort)
done

gpg --batch --yes --armor --detach-sign \
  --output "$release_directory/Release.gpg" \
  "$release_file"
gpg --batch --yes --clearsign \
  --output "$release_directory/InRelease" \
  "$release_file"
