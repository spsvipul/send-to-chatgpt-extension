import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        options: 'src/options/options.ts',
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
  esbuild: {
    target: 'chrome88',
  },
}); 