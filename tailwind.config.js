/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 50: '#f0f3f9', 100: '#d9e0ef', 200: '#b3c1df', 300: '#8da2cf', 400: '#6783bf', 500: '#4164af', 600: '#34508c', 700: '#273c69', 800: '#1a2846', 900: '#0f1a30', 950: '#080d18' },
        brand: { DEFAULT: '#1e3a5f', light: '#2a5082', dark: '#152a45' },
      },
    },
  },
  plugins: [],
}
