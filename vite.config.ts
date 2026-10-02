import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  server: {
    // 5173 is the employee dashboard.
    port: 5174,
    strictPort: true,
  },
  build: {
    // One self-contained dist/widget.js (styles included) that a business embeds
    // with a single <script> tag.
    lib: {
      entry: 'src/main.ts',
      name: 'SamatricaWidget',
      formats: ['iife'],
      fileName: () => 'widget.js',
    },
  },
})
