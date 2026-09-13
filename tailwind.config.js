/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2563EB',
          dark: '#1E40AF',
          // Variante clara de marca, para texto/acentos legibles sobre
          // fondos oscuros (donde brand.dark se ve casi negro).
          light: '#93C5FD',
          tint: '#EFF6FF',
        },
        gold: '#B58A2A',
        success: '#2F7D57',
        danger: '#B5495B',
      },
    },
  },
  plugins: [],
}
