import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-lib':     ['pdf-lib'],
          'pdfjs-dist':  ['pdfjs-dist'],
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
})
