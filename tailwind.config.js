/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Unbounded', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'slide-up': 'slide-up 250ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      colors: {
        slate: {
          50: 'rgba(255, 255, 255, 0.15)',
          100: 'rgba(255, 255, 255, 0.35)',
          200: 'rgba(255, 255, 255, 0.65)',
          300: '#B89ECC',
          400: '#8A67A8',
          500: '#6E488C',
          600: '#5F357D',
          700: '#4E2768',
          800: '#3D1C52',
          900: '#2A1238',
          950: '#100e28',
        },
        brand: {
          50: '#fff1f4',
          100: '#ffe4ea',
          200: '#fecdd8',
          300: '#fda4ba',
          400: '#fb7193',
          500: '#ff6a5c',
          600: '#ff4f7b',
          700: '#e12b5b',
          800: '#b81e46',
          900: '#7e1432',
        },
      },
    },
  },
  plugins: [],
};
