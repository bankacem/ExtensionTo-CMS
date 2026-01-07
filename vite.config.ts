import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],

  // Absolute Frontend Root
  root: resolve(__dirname, 'src'),

  // Build Output - Isolated
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html')
      }
    }
  },

  // Development Server - Frontend Only
  server: {
    port: 3000,
    strictPort: true,
    open: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8788',
        changeOrigin: true,
      },
    },
  },

  // Path Aliases - Nuclear Precision
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types'),
      '@services': resolve(__dirname, 'src/services'),
      '@store': resolve(__dirname, 'src/store')
    }
  },

  // TypeScript - Frontend Only
  esbuild: {
    target: 'es2022',
    format: 'esm'
  },

  // Optimize Dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
})