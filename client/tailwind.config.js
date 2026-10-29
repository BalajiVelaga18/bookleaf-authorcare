/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f4f6f8',
          100: '#e3e8ec',
          200: '#c7d0d8',
          300: '#9dabb8',
          400: '#6f8092',
          500: '#4e6074',
          600: '#384b5f',
          700: '#28384a',
          800: '#1c2736',
          900: '#0f1724',
          950: '#080c14',
        },
        leaf: {
          50: '#effcf6',
          100: '#d7f6e8',
          200: '#b2ebd4',
          300: '#7ddabc',
          400: '#46c19f',
          500: '#24a585',
          600: '#18846b',
          700: '#156a57',
          800: '#135447',
          900: '#11453c',
        },
        paper: '#faf9f6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 36, 0.06), 0 4px 12px rgba(15, 23, 36, 0.04)',
        elevated: '0 8px 30px rgba(15, 23, 36, 0.08)',
      },
    },
  },
  plugins: [],
};
