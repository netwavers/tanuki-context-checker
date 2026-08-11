import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  root: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: false,
  },
});

