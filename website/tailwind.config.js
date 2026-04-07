/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#F97316',
          light: '#FED7AA',
          lighter: '#FFF7ED',
          dark: '#EA580C',
        },
        dental: {
          blue: '#0EA5E9',
          green: '#10B981',
          purple: '#8B5CF6',
          pink: '#EC4899',
          yellow: '#F59E0B',
        },
        sidebar: '#1F2937',
        surface: '#FFFFFF',
        background: '#F3F4F6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
        'card-hover': '0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
}
