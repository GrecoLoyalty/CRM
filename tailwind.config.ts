import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        base: {
          900: "#0B0E14",
          800: "#12161F",
          700: "#1A2030",
          600: "#232B3F",
        },
        accent: {
          DEFAULT: "#3AA7A1", // teal industrial — remite a "flujo" / tubería de proceso
          soft: "#5FC4BE",
          dim: "#1E4E4A",
        },
        signal: {
          info: "#3B82F6",
          warn: "#EAB308",
          urgent: "#EF4444",
          gold: "#D4AF37",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
