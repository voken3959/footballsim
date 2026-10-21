/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0b0f12',
          panel: '#11161b',
          card: '#151b21',
          border: '#232b33',
        },
        accent: {
          DEFAULT: '#1f9d6b',
          soft: '#2bb27d',
          dim: '#155c3f',
        },
        txt: {
          DEFAULT: '#e7edf3',
          muted: '#8d99a6',
          dim: '#5b6672',
        },
        state: {
          win: '#3ddc97',
          loss: '#ef5350',
          draw: '#b0bec5',
          warn: '#f0b429',
          info: '#4dabf7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
