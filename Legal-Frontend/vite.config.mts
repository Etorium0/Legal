import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Update target if your backend runs on a different port/host
const API_TARGET = process.env.API_TARGET || 'http://localhost:8080'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
})
