import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'clsx', 'tailwind-merge'],
          auth: ['@supabase/supabase-js'],
          notifications: ['@onesignal/node-onesignal'],
          forms: ['react-hook-form'],
          state: ['zustand']
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
      }
    },
    reportCompressedSize: false,
    sourcemap: false
  },
  server: {
    headers: {
      'Cache-Control': 'public, max-age=31536000',
    },
  },
});