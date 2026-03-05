/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        arasaka: {
          bg: "#09090b",       // Void Black
          surface: "#18181b",  // Gunmetal Panels
          border: "#27272a",   // Subtle Edges
          primary: "#dc2626",  // Arasaka Red (Critical)
          accent: "#ef4444",   // High Alert Red
          text: "#e4e4e7",     // Standard Issue White
          muted: "#a1a1aa",    // Ghost Text
          terminal: "#10b981", // Success Matrix
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'], // Para dados e logs
        display: ['Orbitron', 'Rajdhani', 'sans-serif'], // Para títulos (instalar via Google Fonts depois)
      },
      animation: {
        'scanline': 'scanline 8s linear infinite',
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glitch': 'glitch 1s linear infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' }
        },
        glitch: {
          '2%, 64%': { transform: 'translate(2px,0) skew(0deg)' },
          '4%, 60%': { transform: 'translate(-2px,0) skew(0deg)' },
          '62%': { transform: 'translate(0,0) skew(5deg)' },
        }
      }
    },
  },
  plugins: [],
}