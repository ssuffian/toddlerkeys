import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import download from '../api/download.mjs';
import { renderCask } from '../scripts/publish-homebrew.mjs';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const asset = (name, digest = 'a'.repeat(64)) => ({ name, state: 'uploaded', digest: `sha256:${digest}`, browser_download_url: `https://github.com/ssuffian/toddlerkeys/releases/download/v0.1.7/${name}` });
const mac = asset('Toddler-Keys-macOS-Apple-Silicon.dmg');
function response() {
  return { headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, send(body) { this.body = body; }, redirect(code, url) { this.code = code; this.url = url; } };
}

test('Mac downloads skip Linux-only releases and unpublished releases', async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => [
    { assets: [asset('Toddler-Keys-Linux-x64.deb')] },
    { draft: true, assets: [mac] },
    { prerelease: true, assets: [mac] },
    { assets: [mac] },
  ] });
  const res = response();
  await download({ url: '/api/download?platform=mac-arm64' }, res);
  assert.equal(res.code, 307);
  assert.equal(res.url, mac.browser_download_url);
  assert.match(res.headers['Cache-Control'], /s-maxage=300/);
});

test('downloads paginate past releases without this platform', async () => {
  let requests = 0;
  globalThis.fetch = async () => ({ ok: true, json: async () => ++requests === 1 ? Array.from({ length: 100 }, () => ({ assets: [] })) : [{ assets: [mac] }] });
  const res = response();
  await download({ url: '/api/download?platform=mac-arm64' }, res);
  assert.equal(requests, 2);
  assert.equal(res.code, 307);
});

test('invalid platform never calls GitHub', async () => {
  globalThis.fetch = () => { throw new Error('Unexpected request'); };
  for (const platform of ['unknown', 'toString', '__proto__']) {
    const res = response();
    await download({ url: `/api/download?platform=${platform}` }, res);
    assert.equal(res.code, 400);
  }
});

test('GitHub failure returns a retryable uncached error', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 403 });
  const res = response();
  await download({ url: '/api/download?platform=mac-arm64' }, res);
  assert.equal(res.code, 503);
  assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('unavailable and untrusted assets cannot redirect', async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => [{ assets: [{ ...mac, browser_download_url: 'https://example.com/untrusted' }] }] });
  const res = response();
  await download({ url: '/api/download?platform=mac-arm64' }, res);
  assert.equal(res.code, 404);
});

const release = () => ({ tag_name: 'v0.1.10', assets: [asset('Toddler-Keys-macOS-Apple-Silicon.zip'), asset('Toddler-Keys-macOS-Intel.zip', 'b'.repeat(64))] });
test('cask pins version and both architecture hashes', () => {
  const cask = renderCask(release());
  assert.match(cask, /version "0.1.10"/);
  assert.ok(cask.includes('a'.repeat(64)));
  assert.ok(cask.includes('b'.repeat(64)));
  assert.ok(cask.includes('v#{version}'));
  assert.ok(cask.includes('app "Toddler Keys.app"'));
});
test('incomplete or unsigned-checksum releases cannot update Homebrew', () => {
  const missing = release(); missing.assets.pop();
  assert.throws(() => renderCask(missing), /publish both Macs first/);
  const noHash = release(); noHash.assets[0].digest = null;
  assert.throws(() => renderCask(noHash), /SHA-256/);
  assert.throws(() => renderCask({ ...release(), draft: true }), /stable version/);
});
