import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base must match the GitHub Pages project path (https://<user>.github.io/sweat-rivals/)
export default defineConfig({
  base: '/sweat-rivals/',
  plugins: [react(), tailwindcss()],
})
