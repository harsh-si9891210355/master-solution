import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'; // Import this
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Add this to your plugins array
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});