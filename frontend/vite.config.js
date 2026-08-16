import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      // Uploaded files (Aadhar/DL photos etc) are served by the backend at /uploads/**,
      // not under /api — without this, <img src="/uploads/xyz.jpg"> 404s against the
      // Vite dev server instead of reaching the backend.
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
