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
        background: "#070a13",
        surface: "#0d1322",
        panel: "#0d1322",
        glass: "rgba(13, 19, 34, 0.65)",
        cyber: {
          cyan: "#00f0ff",
          emerald: "#00ff88",
          amber: "#ffb700",
          crimson: "#ff0055",
          purple: "#a855f7",
          blue: "#3b82f6",
        },
        hud: {
          text: "#F5FAFF",
          secondary: "#9FB6CC",
          border: "rgba(30, 41, 59, 0.8)",
          grid: "rgba(0, 240, 255, 0.05)",
        },
        // Direct tokens
        "brand-bg": "#070a13",
        "panel-bg": "#0d1322",
        "panel-border": "#1E293B",
        "cyan": "#00f0ff",
        "emerald": "#00ff88",
        "amber": "#ffb700",
        "crimson": "#ff0055",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"],
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        "cyan-glow": "0 0 25px -3px rgba(0, 240, 255, 0.35)",
        "emerald-glow": "0 0 25px -3px rgba(0, 255, 136, 0.35)",
        "crimson-glow": "0 0 25px -3px rgba(255, 0, 85, 0.4)",
        "amber-glow": "0 0 25px -3px rgba(255, 183, 0, 0.35)",
        "panel-glow": "0 8px 32px 0 rgba(0, 0, 0, 0.7)",
      },
      animation: {
        "pulse-fast": "pulse 1.0s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scan-line": "scanline 6s linear infinite",
        "radar-sweep": "radarSweep 3s linear infinite",
        "shockwave": "shockwave 1.5s cubic-bezier(0.1, 0.8, 0.3, 1) infinite",
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
        shockwave: {
          "0%": { transform: "scale(1)", opacity: "0.8" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
}
