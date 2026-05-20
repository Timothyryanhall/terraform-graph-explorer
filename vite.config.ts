import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from /terraform-graph-explorer/ on GitHub Pages. Override with
// VITE_BASE=/ for local dev against a custom origin.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/terraform-graph-explorer/',
})
