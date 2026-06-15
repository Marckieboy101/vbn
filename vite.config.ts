import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify -- file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      headers: {
        // MediaPipe (WASM + JS glue) requires unsafe-eval / wasm-unsafe-eval.
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://accounts.google.com blob:",
          "worker-src 'self' blob:",
          "connect-src 'self' https: wss: ws:",
          "img-src 'self' data: blob: https:",
          "media-src 'self' blob: mediastream:",
          "style-src 'self' 'unsafe-inline'",
          "font-src 'self' data:",
          "frame-src https://accounts.google.com",
        ].join('; '),
      },
    },
  };
});
