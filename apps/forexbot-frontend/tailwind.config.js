/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#111111',
        border: '#1e1e1e',
        muted: '#666666',
        mt: {
          blue: '#2196f3',
          red: '#f44336',
          green: '#4caf50',
          yellow: '#ff9800',
          bg: '#0a0a0a',
          panel: '#111111',
          panel2: '#0d0d0d',
          border: '#1e1e1e',
          border2: '#2a2a2a',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};