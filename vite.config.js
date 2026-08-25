import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuración de Vite para la SPA del portal SpFc/Gd.
// base: './' para que los assets usen rutas relativas y el build funcione
// en subcarpetas (GitHub Pages sirve desde /spfc-portal/).
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    // Separa las librerías grandes en chunks estáticos: se cachean una vez
    // en el navegador y las páginas (lazy) solo descargan su propio código.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          supabase: ['@supabase/supabase-js'],
          icons: ['lucide-react'],
        },
      },
    },
  },
})
