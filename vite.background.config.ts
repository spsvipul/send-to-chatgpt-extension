import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: 'src/background/background.ts',
      output: {
        entryFileNames: 'background.js',
        format: 'iife',
        inlineDynamicImports: true,
      },
    },
  },
  esbuild: {
    target: 'chrome88',
  },
}); 