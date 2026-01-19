/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans JP', 'system-ui', 'sans-serif'],
        japanese: ['Noto Sans JP', 'Hiragino Kaku Gothic Pro', 'sans-serif'],
      },
      colors: {
        sakura: {
          50: '#fef7f8',
          100: '#fdeef0',
          200: '#fbd4da',
          300: '#f7a8b5',
          400: '#f1768c',
          500: '#e84a67',
          600: '#d42a4d',
          700: '#b21d3d',
          800: '#951b38',
          900: '#7d1a34',
        },
        ink: {
          50: '#f6f6f7',
          100: '#e2e3e5',
          200: '#c5c6cb',
          300: '#a0a2aa',
          400: '#7b7e88',
          500: '#60636d',
          600: '#4c4e57',
          700: '#3f4147',
          800: '#35373c',
          900: '#1a1b1e',
          950: '#0d0d0f',
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave': 'wave 1.2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.1)', opacity: '0.8' },
        },
        'wave': {
          '0%, 100%': { transform: 'scaleY(0.5)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
    },
  },
  plugins: [],
};
