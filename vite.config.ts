import { defineConfig } from 'vite';

export default defineConfig({
  base: '/OpenReview/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
