/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#eef2f9',
          100: '#d5dfef',
          200: '#aabfdf',
          300: '#7f9fcf',
          400: '#547fbf',
          500: '#2960af',
          600: '#1e4d8c',
          700: '#163a69',
          800: '#0e2746',
          900: '#071423',
          950: '#030a12',
        },
        amber: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:  ['"Source Sans 3"', '"Source Sans Pro"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-in-out',
        'slide-in':   'slideIn 0.3s ease-out',
        'slide-out':  'slideOut 0.3s ease-in',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' },               '100%': { opacity: '1' } },
        slideIn: { '0%': { opacity: '0', transform: 'translateX(30px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        slideOut:{ '0%': { opacity: '1', transform: 'translateX(0)' },    '100%': { opacity: '0', transform: 'translateX(-30px)' } },
      },
    },
  },
  plugins: [],
}
