import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerZIP } from '@electron-forge/maker-zip';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const signingIdentity = process.env.MACOS_SIGN_IDENTITY;
const notaryKeychainProfile = process.env.MACOS_NOTARY_PROFILE;
// @electron/packager supports this flag at runtime, but its public macOS
// signing type currently omits it. Keeping it in a variable avoids weakening
// the type of the whole Forge configuration.
const macSignOptions = signingIdentity
  ? { identity: signingIdentity, continueOnError: false }
  : undefined;

// Adapted from the official Forge 7.11.2 Vite + TypeScript template.
const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: 'assets/AppIcon.icns',
    appBundleId: 'local.toddlerkeys.app',
    appCategoryType: 'public.app-category.education',
    osxSign: macSignOptions,
    osxNotarize: notaryKeychainProfile ? { keychainProfile: notaryKeychainProfile } : undefined,
  },
  rebuildConfig: {},
  makers: [new MakerZIP({}, ['darwin'])],
  plugins: [
    new VitePlugin({
      build: [
        { entry: 'src/main/main.ts', config: 'vite.main.config.ts', target: 'main' },
        { entry: 'src/preload.ts', config: 'vite.preload.config.ts', target: 'preload' },
      ],
      renderer: [{ name: 'main_window', config: 'vite.renderer.config.ts' }],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
export default config;
