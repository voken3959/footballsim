/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#090c10', // Deep slate/black
          panel: '#10151a',   // Slightly lighter for cards
          card: '#161c22',    // Card background
          hover: '#1e252d',   // Hover state
          border: '#2a333d',  // Softer borders
        },
        accent: {
          DEFAULT: '#10b981', // Punchy emerald
          soft: '#34d399',
          dim: '#064e3b',
        },
        txt: {
          DEFAULT: '#f1f5f9', // Off-white
          muted: '#94a3b8',   // Slate-400
          dim: '#64748b',     // Slate-500
        },
        state: {
          win: '#10b981',
          loss: '#ef4444',
          draw: '#94a3b8',
          warn: '#f59e0b',
          info: '#3b82f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        'inner-top': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      },
    },
  },
  plugins: [],
};