import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  
  // DODAJTE OVO ⬇️
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '/src': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  
  // Development server config
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        secure: false
      }
    }
  },
  
  // Production build config
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  },
  
  // Preview server config
  preview: {
    port: 3000,
    host: true,
    allowedHosts: true
  }
})