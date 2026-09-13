import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Inter para la interfaz, Fraunces para encabezados/cifras grandes
        // (identidad del prototipo original). "platform" es aparte a
        // propósito: el wordmark "RB Suite" es el nombre del sistema, no
        // del negocio, así que nunca debe tomar la tipografía de marca de
        // un negocio en particular (ver AppLayout.tsx).
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        serif: ['Fraunces', ...defaultTheme.fontFamily.serif],
        platform: ['Sora', ...defaultTheme.fontFamily.sans],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
      },
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
