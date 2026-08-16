/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary:   { 500: '#FF6B00', 600: '#ea580c', 700: '#c2410c' },
        secondary: { 500: '#1A237E', 600: '#151c6b' },
        gold: '#FFD700',
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body:    ['DM Sans',  'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.08)',
        glow: '0 0 24px rgba(255,107,0,0.25)',
      },
    },
  },
  plugins: [],
}
