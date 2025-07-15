// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Korus Green Glassmorphism Palette
        korus: {
          primary: '#43e97b',
          secondary: '#38f9d7',
          accent: '#2dd4bf',
          glow: '#22c55e',
          dark: {
            100: '#0a0a0a',
            200: '#111111',
            300: '#1a1a1a',
            400: '#252525',
            500: '#2d2d2d',
          },
          glass: {
            light: 'rgba(67, 233, 123, 0.15)',
            medium: 'rgba(67, 233, 123, 0.25)',
            heavy: 'rgba(67, 233, 123, 0.35)',
          }
        }
      },
      gradients: {
        'korus-primary': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'korus-dark': 'linear-gradient(135deg, #000000 0%, #0a0a0a 25%, #1a1a1a 50%, #111111 75%, #000000 100%)',
        'korus-card': 'linear-gradient(135deg, rgba(25, 25, 25, 0.95) 0%, rgba(20, 20, 20, 0.98) 50%, rgba(15, 15, 15, 0.99) 100%)',
      },
      boxShadow: {
        'korus-glow': '0 0 20px rgba(67, 233, 123, 0.3)',
        'korus-card': '0 8px 32px rgba(0, 0, 0, 0.6)',
        'korus-button': '0 4px 16px rgba(67, 233, 123, 0.2)',
      },
      backdropBlur: {
        'korus': '30px',
      }
    },
  },
  plugins: [],
};