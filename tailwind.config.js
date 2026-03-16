/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'orb-breathe': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
        'orb-pulse': {
          '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(139, 92, 246, 0.4)' },
          '70%': { transform: 'scale(1.05)', boxShadow: '0 0 0 10px rgba(139, 92, 246, 0)' },
          '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(139, 92, 246, 0)' },
        },
        'orb-wave': {
          '0%': { transform: 'scale(1) translateY(0)' },
          '50%': { transform: 'scale(1.02) translateY(-2px)' },
          '100%': { transform: 'scale(1) translateY(0)' },
        },
        'slide-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.2s ease-out',
        'orb-breathe': 'orb-breathe 3s ease-in-out infinite',
        'orb-pulse': 'orb-pulse 2s infinite',
        'orb-wave': 'orb-wave 1s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
