/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#ECFEFF',
          100: '#CFFAF8',
          200: '#A5F3EB',
          300: '#67E8D9',
          400: '#2FD7C6',
          500: '#0891B2',
          600: '#0E7490',
          700: '#155E75',
          800: '#164E63',
          900: '#0F3340',
        },
        accent: {
          50: '#FEF3C7',
          100: '#FDE68A',
          500: '#D97706',
          600: '#B45309',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,23,42,.05), 0 1px 3px rgba(15,23,42,.05)',
        card: '0 1px 2px rgba(15,23,42,.04), 0 1px 3px rgba(15,23,42,.03)',
        'card-hover': '0 2px 8px rgba(15,23,42,.08), 0 4px 16px rgba(15,23,42,.06)',
        float: '0 12px 28px rgba(15,23,42,.10)',
      },
      borderRadius: {
        card: '12px',
        'card-lg': '16px',
      },
    },
  },
  plugins: [],
}
