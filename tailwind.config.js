/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,js,html}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        skyzone: {
          // Hochzone
          glacier: '#E0F4FF',
          iceblue: '#BEE3F8',
          turquoise: '#38B2AC',
          frost: '#FFFFFF',
          // Mittelzone
          softsky: '#C7D2FE',
          pastelazure: '#93C5FD',
          droplet: '#3B82F6',
          feathercloud: '#F8FAFC',
          // Tiefzone
          twilight: '#4C1D95',
          stormindigo: '#5B21B6',
          glowgold: '#FBBF24',
          aurorarose: '#F472B6',
          // UI & Hafen
          darksalt: '#1E293B',
          deepvoid: '#0F172A',
          brass: '#F59E0B',
          emerald: '#10B981',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
