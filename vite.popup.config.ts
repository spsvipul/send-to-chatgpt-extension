import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: 'src/popup/popup.ts',
      output: {
        entryFileNames: 'popup.js',
        format: 'iife',
        inlineDynamicImports: true,
      },
    },
  },
  esbuild: {
    target: 'chrome88',
  },
});