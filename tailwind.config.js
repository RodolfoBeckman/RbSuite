/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Respaldadas por CSS custom properties (ver src/index.css) para
        // que cada negocio pueda personalizar su color de marca en runtime
        // (src/theme/useApplyBranding.ts) en vez de un valor fijo de build.
        // El formato "rgb(var(--x) / <alpha-value>)" es el que exige
        // Tailwind para que utilidades con opacidad (bg-brand/20) sigan
        // funcionando.
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          dark: 'rgb(var(--brand-dark) / <alpha-value>)',
          light: 'rgb(var(--brand-light) / <alpha-value>)',
          tint: 'rgb(var(--brand-tint) / <alpha-value>)',
        },
        gold: '#B58A2A',
        success: '#2F7D57',
        danger: '#B5495B',
      },
    },
  },
  plugins: [],
}
