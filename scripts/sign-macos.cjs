#!/usr/bin/env node

const path = require('node:path');
const { signAsync } = require('@electron/osx-sign');

const [appPath, identity] = process.argv.slice(2);

if (!appPath || !identity) {
  console.error('Usage: sign-macos.cjs APP_PATH SIGNING_IDENTITY');
  process.exit(2);
}

const entitlements = path.resolve(__dirname, '../assets/entitlements.mac.plist');

signAsync({
  app: path.resolve(appPath),
  identity,
  platform: 'darwin',
  type: 'distribution',
  version: require('electron/package.json').version,
  preAutoEntitlements: false,
  preEmbedProvisioningProfile: false,
  strictVerify: true,
  optionsForFile: () => ({
    entitlements,
    hardenedRuntime: true,
  }),
}).catch(error => {
  console.error(error);
  process.exit(1);
});
