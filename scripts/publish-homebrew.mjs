#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const tap = 'ssuffian/homebrew-tap';
const caskPath = 'Casks/toddlerkeys.rb';

export function renderCask(release) {
  if (release.draft || release.prerelease || !/^v\d+\.\d+\.\d+$/.test(release.tag_name)) {
    throw new Error('Homebrew requires a published stable version.');
  }
  const hashes = ['Apple-Silicon', 'Intel'].map(arch => {
    const asset = release.assets.find(item => item.name === `Toddler-Keys-macOS-${arch}.zip` && item.state === 'uploaded');
    if (!asset || !/^sha256:[a-f0-9]{64}$/.test(asset.digest)) {
      throw new Error(`Missing uploaded ${arch} ZIP or SHA-256 digest; publish both Macs first.`);
    }
    return asset.digest.slice(7);
  });
  return `cask "toddlerkeys" do
  arch arm: "Apple-Silicon", intel: "Intel"

  version "${release.tag_name.slice(1)}"
  sha256 arm:   "${hashes[0]}",
         intel: "${hashes[1]}"

  url "https://github.com/ssuffian/toddlerkeys/releases/download/v#{version}/Toddler-Keys-macOS-#{arch}.zip"
  name "Toddler Keys"
  desc "Offline keyboard play space for young children"
  homepage "https://toddlerkeys.vercel.app/"

  depends_on macos: ">= :ventura"

  app "Toddler Keys.app"
end
`;
}

function gh(...args) {
  return execFileSync('gh', args, { encoding: 'utf8' });
}

function publish() {
  const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version;
  const release = JSON.parse(gh('api', `repos/ssuffian/toddlerkeys/releases/tags/v${version}`));
  const content = renderCask(release);
  let previous;
  try {
    previous = JSON.parse(gh('api', `repos/${tap}/contents/${caskPath}`));
  } catch (error) {
    if (!String(error.stderr).includes('(HTTP 404)')) throw error;
  }
  if (previous && Buffer.from(previous.content, 'base64').toString() === content) {
    console.log(`Homebrew already publishes ${version}.`);
    return;
  }
  // Refuse to replace a newer cask with a rerun of an older release.
  const oldVersion = previous && Buffer.from(previous.content, 'base64').toString().match(/version "([\d.]+)"/)?.[1];
  if (oldVersion && oldVersion.localeCompare(version, undefined, { numeric: true }) > 0) {
    throw new Error(`Homebrew already has newer version ${oldVersion}.`);
  }
  const body = { message: `Update Toddler Keys to ${version}`, content: Buffer.from(content).toString('base64'), ...(previous ? { sha: previous.sha } : {}) };
  execFileSync('gh', ['api', '--method', 'PUT', `repos/${tap}/contents/${caskPath}`, '--input', '-'], {
    input: JSON.stringify(body), stdio: ['pipe', 'ignore', 'inherit'],
  });
  console.log(`Published ${version} to https://github.com/${tap}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) publish();
