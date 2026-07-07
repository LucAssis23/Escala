import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // BASE_PATH é usado no deploy do GitHub Pages (ex.: /Escala/); na Vercel/local fica '/'
  base: process.env.BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
})
