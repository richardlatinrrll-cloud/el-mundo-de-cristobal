import { defineConfig } from 'vite';

// La app se sirve como archivos estáticos (también desde el servidor casero).
// base './' hace que funcione en cualquier subcarpeta.
export default defineConfig({
  base: './',
  server: { host: true },
  build: { target: 'es2020', outDir: 'dist' },
});
