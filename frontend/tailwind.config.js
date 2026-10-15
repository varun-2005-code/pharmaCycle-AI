/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        botanical: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#0f3e2e', // Deep botanical green primary
          950: '#08281d',
        },
        tealAccent: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6', // Teal secondary accent
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        offwhite: {
          DEFAULT: '#f8faf9',
          card: '#ffffff',
          subtle: '#f1f5f3',
        },
        status: {
          identified: '#2563eb',          // Blue
          awaiting: '#d97706',            // Amber
          pending: '#7c3aed',             // Purple
          collected: '#0d9488',           // Teal
          processed: '#15803d',           // Botanical Green
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(15, 62, 46, 0.07), 0 4px 6px -2px rgba(15, 62, 46, 0.04)',
        'soft-lg': '0 10px 25px -3px rgba(15, 62, 46, 0.1), 0 4px 10px -2px rgba(15, 62, 46, 0.05)',
      }
    },
  },
  plugins: [],
}
