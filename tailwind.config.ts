import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        /* ---- Superficies: azul marino profundo, sobrio ---- */
        base: {
          950: "#05080F", // fondo más profundo (detrás de todo)
          900: "#090E19", // fondo de la app
          850: "#0C121F", // realce sutil
          800: "#101828", // superficie de tarjeta
          750: "#141D30", // hover de tarjeta / fila
          700: "#1A2439", // elevado (inputs sobre tarjeta)
          600: "#253150", // borde por defecto
          500: "#33436B", // borde fuerte / avatar
        },

        /* ---- Acento: azul eléctrico (interactivo) ---- */
        accent: {
          DEFAULT: "#2F8BFF",
          soft: "#6FB2FF",
          neon: "#57D6FF", // cian para los bordes con brillo
          dim: "#0F2E52",
        },

        /* ---- Neón: solo para bordes y destellos, nunca para texto largo ---- */
        neon: {
          cyan: "#4DE0FF",
          blue: "#4A9BFF",
          violet: "#A78BFA",
        },

        /* ---- Señales de estado ---- */
        signal: {
          info: "#38BDF8",
          ok: "#34D399",
          warn: "#F5B62F",
          urgent: "#FF5A5A",
          gold: "#E3BC5A",
        },

        /* ---- Grises con tinte azul y contraste corregido (WCAG AA) ----
           Reemplaza la escala gris de Tailwind: los ~200 usos de
           text-gray-400/500/600 que ya existen en el código pasan a ser
           legibles sin tocar ni un archivo.                              */
        gray: {
          50: "#F7F9FD",
          100: "#EEF2FB", // texto principal
          200: "#DCE4F2",
          300: "#C3CEE4",
          400: "#A6B4CE", // texto secundario  (~7:1)
          500: "#8A9BB8", // etiquetas apagadas (~5.5:1, antes 4.3:1)
          600: "#6F81A0", // placeholders / iconos
          700: "#4A5A78",
          800: "#2C3A54",
          900: "#16203A",
        },
      },

      /* Pasos de opacidad extra: Tailwind solo trae múltiplos de 5 y
         los tintes de las tarjetas/badges necesitan valores más finos. */
      opacity: {
        7: "0.07",
        12: "0.12",
        18: "0.18",
        22: "0.22",
      },

      fontFamily: {
        display: ["var(--font-display)", "Space Grotesk", "sans-serif"],
        body: ["var(--font-body)", "Inter", "sans-serif"],
        sans: ["var(--font-body)", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },

      /* ---- Bordes neón + elevación de elementos flotantes ---- */
      boxShadow: {
        "glow-accent":
          "0 0 0 1px rgba(47,139,255,0.40), 0 0 24px -6px rgba(47,139,255,0.45)",
        "glow-cyan":
          "0 0 0 1px rgba(77,224,255,0.40), 0 0 24px -6px rgba(77,224,255,0.40)",
        "glow-info":
          "0 0 0 1px rgba(56,189,248,0.40), 0 0 28px -8px rgba(56,189,248,0.45)",
        "glow-ok":
          "0 0 0 1px rgba(52,211,153,0.40), 0 0 28px -8px rgba(52,211,153,0.45)",
        "glow-warn":
          "0 0 0 1px rgba(245,182,47,0.40), 0 0 28px -8px rgba(245,182,47,0.45)",
        "glow-urgent":
          "0 0 0 1px rgba(255,90,90,0.45), 0 0 32px -8px rgba(255,90,90,0.55)",
        card: "0 1px 2px rgba(0,0,0,0.40), 0 8px 24px -14px rgba(0,0,0,0.65)",
        float:
          "0 12px 44px -14px rgba(0,0,0,0.80), 0 0 0 1px rgba(255,255,255,0.05)",
        "inner-top": "inset 0 1px 0 0 rgba(255,255,255,0.06)",
      },

      backgroundImage: {
        "sheen-accent":
          "linear-gradient(135deg, rgba(47,139,255,0.14) 0%, rgba(47,139,255,0) 55%)",
        "sheen-top":
          "linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0) 60%)",
        "grid-faint":
          "linear-gradient(rgba(37,49,80,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(37,49,80,0.35) 1px, transparent 1px)",
      },

      backgroundSize: {
        grid: "32px 32px",
      },

      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.375rem",
      },

      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },

      animation: {
        "fade-in": "fade-in 200ms ease-out both",
        "slide-down": "slide-down 220ms cubic-bezier(0.16,1,0.3,1) both",
        "slide-up": "slide-up 220ms cubic-bezier(0.16,1,0.3,1) both",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};
export default config;
