const assets = {
  'mac-arm64': 'Toddler-Keys-macOS-Apple-Silicon.dmg',
  'mac-x64': 'Toddler-Keys-macOS-Intel.dmg',
  'linux-arm64': 'Toddler-Keys-Linux-arm64.deb',
  'linux-x64': 'Toddler-Keys-Linux-x64.deb',
};

// Platforms publish independently. Find the newest release with this download,
// rather than assuming GitHub's latest release contains every platform.
export default async function download(req, res) {
  const platform = new URL(req.url, 'https://toddlerkeys.vercel.app').searchParams.get('platform');
  const filename = Object.hasOwn(assets, platform) ? assets[platform] : undefined;
  if (!filename) return res.status(400).send('Choose a supported download platform.');
  try {
    for (let page = 1; page <= 10; page++) {
      const response = await fetch(`https://api.github.com/repos/ssuffian/toddlerkeys/releases?per_page=100&page=${page}`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Toddler-Keys-downloads' },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
      const releases = await response.json();
      for (const release of releases) {
        if (release.draft || release.prerelease) continue;
        const asset = release.assets.find(item => item.name === filename && item.state === 'uploaded');
        if (!asset) continue;
        // Only redirect to this repository's release assets.
        if (!asset.browser_download_url.startsWith('https://github.com/ssuffian/toddlerkeys/releases/download/')) continue;
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
        return res.redirect(307, asset.browser_download_url);
      }
      if (releases.length < 100) break;
    }
    return res.status(404).send('This download is not published yet. Please try again later.');
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Retry-After', '60');
    return res.status(503).send('Downloads are temporarily unavailable. Please retry or visit https://github.com/ssuffian/toddlerkeys/releases.');
  }
}
