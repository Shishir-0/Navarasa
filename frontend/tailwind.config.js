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
        background: "#05070B",
        surface: "rgba(18, 22, 30, 0.72)",
        elevated: "rgba(28, 34, 46, 0.82)",
        panel: "rgba(18, 22, 30, 0.75)",
        glass: "rgba(18, 22, 30, 0.72)",
        divider: "rgba(255, 255, 255, 0.08)",
        vision: {
          accent: "#4DA3FF",
          success: "#34D399",
          warning: "#FBBF24",
          danger: "#FF5C7A",
          purple: "#C084FC",
        },
        cyber: {
          cyan: "#4DA3FF",
          emerald: "#34D399",
          amber: "#FBBF24",
          crimson: "#FF5C7A",
          purple: "#C084FC",
          blue: "#38BDF8",
        },
        hud: {
          text: "#F5F7FA",
          secondary: "#9BA6B2",
          border: "rgba(255, 255, 255, 0.08)",
          grid: "rgba(77, 163, 255, 0.04)",
        },
        // Direct semantic tokens
        "brand-bg": "#05070B",
        "panel-bg": "#0d1322",
        "panel-border": "rgba(255, 255, 255, 0.08)",
        "cyan": "#4DA3FF",
        "emerald": "#34D399",
        "amber": "#FBBF24",
        "crimson": "#FF5C7A",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "SF Pro Display", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "Fira Code", "Courier New", "monospace"],
      },
      boxShadow: {
        "vision-glass": "0 20px 40px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08) inset",
        "vision-elevated": "0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.12) inset",
        "vision-island": "0 12px 32px 0 rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1) inset",
        "cyan-glow": "0 0 25px -3px rgba(77, 163, 255, 0.35)",
        "emerald-glow": "0 0 25px -3px rgba(52, 211, 153, 0.35)",
        "crimson-glow": "0 0 25px -3px rgba(255, 92, 122, 0.4)",
        "amber-glow": "0 0 25px -3px rgba(251, 191, 36, 0.35)",
        "panel-glow": "0 8px 32px 0 rgba(0, 0, 0, 0.7)",
      },
      animation: {
        "pulse-subtle": "pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scan-line": "scanline 8s linear infinite",
        "radar-sweep": "radarSweep 3s linear infinite",
        "float": "float 4s ease-in-out infinite",
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
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
    },
  },
  plugins: [],
}
