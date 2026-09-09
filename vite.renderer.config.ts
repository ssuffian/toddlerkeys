import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  root: 'src/renderer',
  base: './',
  // Forge packages the project-level .vite directory. Its default relative
  // output path would otherwise resolve beneath our custom renderer root.
  build: { outDir: path.resolve(__dirname, '.vite/renderer/main_window') },
});
