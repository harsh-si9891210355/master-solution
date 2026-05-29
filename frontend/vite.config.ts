import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'; // Import this
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/dvr-proxy': {
        target: 'http://mediamtx:9996',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dvr-proxy/, ''),
      },
      '/hls': {
        target: 'http://mediamtx:8888',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hls/, ''),
      },
    },
  },
});