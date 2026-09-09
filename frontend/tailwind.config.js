/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#050811",
        panel: "#0B1220",
        glass: "rgba(15, 25, 40, 0.55)",
        cyber: {
          cyan: "#00E5FF",
          emerald: "#00FF88",
          amber: "#FFB700",
          crimson: "#FF0055",
          purple: "#A855F7",
          blue: "#3B82F6",
        },
        hud: {
          text: "#F5FAFF",
          secondary: "#9FB6CC",
          border: "rgba(30, 41, 59, 0.8)",
          grid: "rgba(0, 229, 255, 0.07)",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"],
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        "cyan-glow": "0 0 20px -3px rgba(0, 229, 255, 0.35)",
        "emerald-glow": "0 0 20px -3px rgba(0, 255, 136, 0.35)",
        "crimson-glow": "0 0 20px -3px rgba(255, 0, 85, 0.4)",
        "amber-glow": "0 0 20px -3px rgba(255, 183, 0, 0.35)",
        "panel-glow": "0 8px 32px 0 rgba(0, 0, 0, 0.6)",
      },
      animation: {
        "pulse-fast": "pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scan-line": "scanline 4s linear infinite",
        "radar-sweep": "radarSweep 3s linear infinite",
      },
      keyframes: {
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(1000%)" },
        },
        radarSweep: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
    },
  },
  plugins: [],
}
