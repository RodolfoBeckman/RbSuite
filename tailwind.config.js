/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#7B3F56',
          dark: '#5E2F41',
          // Variante clara de marca, para texto/acentos legibles sobre
          // fondos oscuros (donde brand.dark se ve casi negro).
          light: '#C48CA3',
          tint: '#F4E9EE',
        },
        gold: '#B58A2A',
        success: '#2F7D57',
        danger: '#B5495B',
      },
    },
  },
  plugins: [],
}
