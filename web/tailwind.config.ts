import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        jet: "#080808",
        charcoal: "#171717",
        crimson: { DEFAULT: "#DC143C", 600: "#B80F31", 400: "#F0375C", 300: "#FF6B88" },
        silver: { DEFAULT: "#C0C4CC", 200: "#E5E7EB", 400: "#9CA3AF", 600: "#6B7280" },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(220,20,60,.45), 0 0 24px rgba(220,20,60,.45)",
        "glow-lg": "0 0 0 1px rgba(220,20,60,.6), 0 0 48px rgba(220,20,60,.55)",
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
        pulseGlow: { "0%,100%": { opacity: ".55" }, "50%": { opacity: "1" } },
        scan: { "0%": { transform: "translateY(-100%)" }, "100%": { transform: "translateY(100%)" } },
        gridMove: { "0%": { backgroundPosition: "0 0" }, "100%": { backgroundPosition: "0 64px" } },
        fadeUp: { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        pulseGlow: "pulseGlow 3s ease-in-out infinite",
        scan: "scan 6s linear infinite",
        gridMove: "gridMove 3s linear infinite",
        fadeUp: "fadeUp .7s ease-out both",
      },
    },
  },
  plugins: [],
} satisfies Config;
