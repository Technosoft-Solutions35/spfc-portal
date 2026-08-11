/** @type {import('tailwindcss').Config} */

// Sistema de diseño del portal SpFc/Gd.
// Los colores se definen como variables CSS (ver src/index.css) para alternar
// entre modo claro y modo oscuro de forma dinámica. Tailwind las consume como
// clases utilitarias (bg-surface, text-primary, border-soft, etc.).
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Fondo principal de la app
        background: 'rgb(var(--background) / <alpha-value>)',
        // Superficies / tarjetas / contenedores
        surface: 'rgb(var(--surface) / <alpha-value>)',
        // Superficie elevada (modales, dropdowns, headers)
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        // Color primario (acento rojo del clan)
        primary: 'rgb(var(--primary) / <alpha-value>)',
        // Color secundario (ámbar / shiny)
        secondary: 'rgb(var(--secondary) / <alpha-value>)',
        // Texto principal
        text: 'rgb(var(--text) / <alpha-value>)',
        // Texto secundario / suave
        soft: 'rgb(var(--soft) / <alpha-value>)',
        // Bordes
        edge: 'rgb(var(--edge) / <alpha-value>)',
        // Sombra del éxito / verde
        success: 'rgb(var(--success) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Inter"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        display: ['"Poppins"', '"Inter"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 10px 40px -12px rgb(0 0 0 / 0.35)',
        glow: '0 0 24px -4px rgb(var(--primary) / 0.5)',
        glowSecondary: '0 0 24px -4px rgb(var(--secondary) / 0.45)',
      },
      backgroundImage: {
        'shiny-sweep':
          'linear-gradient(110deg, transparent 20%, rgb(var(--secondary) / 0.16) 50%, transparent 80%)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgb(var(--primary) / 0.5)' },
          '70%': { boxShadow: '0 0 0 12px rgb(var(--primary) / 0)' },
          '100%': { boxShadow: '0 0 0 0 rgb(var(--primary) / 0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2.4s infinite',
        'float-slow': 'float-slow 6s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2s infinite',
      },
    },
  },
  plugins: [],
}
