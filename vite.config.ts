import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    middlewareMode: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/analytics'],
          'icons': ['lucide-react'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/analytics']
  },
  // Prevent server-only packages from leaking into the browser bundle
  resolve: {
    alias: {}
  }
});
