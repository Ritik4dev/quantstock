/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        obsidian: '#070707',
        surface: '#101010',
        card: '#151515',
        'surface-border': 'rgba(255, 255, 255, 0.05)',
        'border-light': 'rgba(255, 255, 255, 0.05)',
        'border-highlight': 'rgba(255, 255, 255, 0.12)',
        accent: {
          DEFAULT: '#C6FF00',
          primary: '#C6FF00',
          secondary: '#9DFF00',
          glow: 'rgba(198, 255, 0, 0.15)',
          'glow-strong': 'rgba(198, 255, 0, 0.4)',
        },
        lime: {
          400: '#C6FF00',
          500: '#C6FF00',
          600: '#9DFF00',
        },
        primary: {
          50: '#F4FFE0',
          100: '#E8FFB3',
          500: '#C6FF00',
          600: '#9DFF00',
          700: '#7ACC00',
        },
        status: {
          success: '#B7FF38',
          warning: '#FFD84D',
          danger: '#FF5B5B',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#8E8E8E',
          muted: '#555555',
        }
      },
      boxShadow: {
        'inspo-base': '0 4px 20px rgba(0, 0, 0, 0.4)',
        'inspo-float': '0 16px 40px -10px rgba(0, 0, 0, 0.7), 0 0 30px rgba(198, 255, 0, 0.15)',
        'inspo-glow': '0 4px 15px rgba(198, 255, 0, 0.4)',
        'inner-highlight': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      borderRadius: {
        'inspo-sm': '8px',
        'inspo-md': '16px',
        'inspo-lg': '24px',
        'inspo-xl': '32px',
      }
    },
  },
  plugins: [],
};

