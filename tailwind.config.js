/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          // Alineado al azul del logo (public/logo.svg): #2F6FA8 de marca,
          // #4FA8E8 como acento claro.
          DEFAULT: '#2F6FA8',
          dark: '#1F4E78',
          // Variante clara de marca, para texto/acentos legibles sobre
          // fondos oscuros (donde brand.dark se ve casi negro).
          light: '#4FA8E8',
          tint: '#EAF3FA',
        },
        gold: '#B58A2A',
        success: '#2F7D57',
        danger: '#B5495B',
      },
    },
  },
  plugins: [],
}
