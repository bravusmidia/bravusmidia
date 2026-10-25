/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#101828', 900: '#0B1220', 800: '#101828', 700: '#1D2939' },
        brand: { DEFAULT: '#2563EB', 50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 400: '#60A5FA', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8', glow: '#22D3EE' },
        ink: { DEFAULT: '#1E293B', soft: '#64748B' },
        line: '#E2E8F0',
        canvas: '#F8FAFC',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'], display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)', pop: '0 12px 32px -8px rgba(16,24,40,.25)' },
    },
  },
  plugins: [],
};
