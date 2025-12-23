import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const API_TARGET = env.VITE_BACKEND_URL || 'http://localhost:8080'
  return {
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
  }
})
