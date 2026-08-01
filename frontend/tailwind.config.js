/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F17',
        surface: '#151C28',
        'surface-border': '#222D3F',
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
        },
        emerald: {
          500: '#10B981',
          600: '#059669',
        },
        rose: {
          500: '#F43F5E',
          600: '#E11D48',
        },
        amber: {
          500: '#F59E0B',
          600: '#D97706',
        }
      },
    },
  },
  plugins: [],
};
