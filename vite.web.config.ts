import { defineConfig } from 'vite';
import path from 'node:path';
import packageJson from './package.json';

export default defineConfig({
  root: 'src/renderer',
  base: './',
  define: { __APP_VERSION__: JSON.stringify(packageJson.version) },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: path.resolve(__dirname, 'src/renderer/index.html'),
        download: path.resolve(__dirname, 'src/renderer/download/index.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
