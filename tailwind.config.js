/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        wishlist: '#8b5cf6',
        applied: '#3b82f6',
        followup: '#eab308',
        interview: '#f97316',
        offer: '#22c55e',
        rejected: '#ef4444',
      },
    },
  },
  plugins: [],
}
