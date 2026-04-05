/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        surface: {
          DEFAULT: '#1e293b',
          2: '#263348',
          3: '#2d3f55',
        },
        dark: '#0f172a',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
