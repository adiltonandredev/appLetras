/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#EAF1FB',
          100: '#D0DFF5',
          200: '#A1BFE9',
          300: '#5E96D8',
          400: '#2D7DD2',
          500: '#1B5BB5',
          600: '#1B3A6B',
          700: '#142C52',
          800: '#0D1E38',
          900: '#060F1C',
        },
        gold: {
          400: '#D4A84B',
          500: '#C9A84C',
          600: '#A8893D',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.05)',
        'card-hover': '0 4px 16px 0 rgba(0,0,0,0.10)',
        'modal': '0 20px 60px -10px rgba(0,0,0,0.15)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};
