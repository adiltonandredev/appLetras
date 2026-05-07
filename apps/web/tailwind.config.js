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
          50: '#F0F4FF',
          100: '#E0E9FF',
          200: '#C0D2FF',
          300: '#90ACFF',
          400: '#5580FF',
          500: '#2D5CA6',
          600: '#1B3A6B',
          700: '#142C52',
          800: '#0D1E38',
          900: '#060F1C',
        },
        gold: {
          300: '#E8C97A',
          400: '#D4A84B',
          500: '#C9A84C',
          600: '#A8893D',
        },
        sacred: {
          bg: '#FAFAF8',
          card: '#FFFFFF',
          muted: '#F5F3EF',
        },
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Montserrat', 'sans-serif'],
        sans: ['var(--font-inter)', 'Nunito', 'system-ui', 'sans-serif'],
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
