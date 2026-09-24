import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Rebrand v2 — cool midnight + aqua
        forest: "#0A1628",
        "forest-dark": "#12233D",
        "forest-deep": "#060D1A",
        primary: {
          DEFAULT: "#007A65",
          hover: "#006B59",
          light: "#7CE8D7",
          soft: "#D6FFF7",
        },
        violet: {
          DEFAULT: "#6D4DE0",
          light: "#A78BFA",
        },
        sky: "#38BDF8",
        cream: "#F4F7FB",
        muted: "#4A5D73",
        border: "#D0DBE8",
        error: "#B4233B",
        warning: "#8A5A00",
        success: "#007A65",
      },
      fontSize: {
        // Slightly larger base for readability (was ~90%)
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.8125rem", { lineHeight: "1.2rem" }],
        base: ["0.9rem", { lineHeight: "1.4rem" }],
        lg: ["1rem", { lineHeight: "1.5rem" }],
        xl: ["1.15rem", { lineHeight: "1.65rem" }],
        "2xl": ["1.45rem", { lineHeight: "1.9rem" }],
        "3xl": ["1.85rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.55rem" }],
        "5xl": ["2.9rem", { lineHeight: "3.15rem" }],
        "6xl": ["3.6rem", { lineHeight: "3.85rem" }],
        "7xl": ["4.05rem", { lineHeight: "4.3rem" }],
        "8xl": ["4.5rem", { lineHeight: "4.75rem" }],
        "9xl": ["5.45rem", { lineHeight: "5.7rem" }],
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "var(--font-manrope)",
          "Inter",
          "Manrope",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: [
          "var(--font-manrope)",
          "var(--font-inter)",
          "Manrope",
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 32px rgba(0, 122, 101, 0.16)",
        "glow-violet": "0 8px 24px rgba(109, 77, 224, 0.12)",
        card: "0 1px 2px rgba(10, 22, 40, 0.04), 0 4px 16px rgba(10, 22, 40, 0.04)",
        "card-hover": "0 4px 20px rgba(10, 22, 40, 0.08)",
        glass: "0 4px 24px rgba(10, 22, 40, 0.06)",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      animation: {
        "fade-in": "fadeIn 0.35s cubic-bezier(0.16,1,0.3,1)",
        "slide-up": "slideUp 0.5s cubic-bezier(0.16,1,0.3,1)",
        "scale-in": "scaleIn 0.25s cubic-bezier(0.16,1,0.3,1)",
        "blur-in": "blurIn 0.5s cubic-bezier(0.16,1,0.3,1)",
        shimmer: "shimmer 2s linear infinite",
        float: "float 6s ease-in-out infinite",
        "float-delayed": "float 6s ease-in-out 3s infinite",
        "pulse-soft": "pulseSoft 2.4s ease-in-out infinite",
        "gradient-x": "gradientX 8s ease infinite",
        "otp-pop": "otpPop 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        "otp-shake": "otpShake 0.45s ease",
        "spin-slow": "spin 1.1s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        blurIn: {
          "0%": { opacity: "0", filter: "blur(12px)", transform: "translateY(10px)" },
          "100%": { opacity: "1", filter: "blur(0)", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        gradientX: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        otpPop: {
          "0%": { transform: "scale(0.86)", opacity: "0.5" },
          "60%": { transform: "scale(1.06)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        otpShake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-6px)" },
          "40%": { transform: "translateX(6px)" },
          "60%": { transform: "translateX(-4px)" },
          "80%": { transform: "translateX(4px)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
