import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#b12121',
        'primary-dark': '#7d1616',
        accent: '#f4c430',
        background: '#fafafa',
        surface: '#ffffff',
        muted: '#6b7280',
        border: '#e5e7eb',
        'slate-950': '#0f172a',
      },
      boxShadow: {
        sm: '0 4px 16px rgba(15, 23, 42, 0.08)',
        md: '0 10px 30px rgba(15, 23, 42, 0.08)',
      },
      borderRadius: {
        sm: '6px',
        md: '12px',
        lg: '18px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      maxWidth: {
        content: '1200px',
      },
      screens: {
        'admin': '1200px', // Custom breakpoint for admin layout
      },
      animation: {
        'infinite-scroll': 'infinite-scroll 25s linear infinite',
      },
      keyframes: {
        'infinite-scroll': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-100%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

