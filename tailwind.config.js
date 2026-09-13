/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#7B3F56',
          dark: '#5E2F41',
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
