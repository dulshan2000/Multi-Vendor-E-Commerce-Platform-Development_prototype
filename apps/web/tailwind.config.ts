import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Surface tokens ──────────────────────────────────────
        surface: {
          0: "var(--color-surface-0)",
          1: "var(--color-surface-1)",
          2: "var(--color-surface-2)",
        },
        border: "var(--color-border)",
        // ── Text tokens ──────────────────────────────────────────
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          tertiary: "var(--color-text-tertiary)",
        },
        // ── Accent (champagne gold) ───────────────────────────────
        accent: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent-hover)",
          muted: "var(--color-accent-muted)",
        },
        // ── Semantic ─────────────────────────────────────────────
        destructive: "var(--color-destructive)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
      },

      fontFamily: {
        display: ["var(--font-cormorant)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },

      fontSize: {
        "display-2xl": ["5rem", { lineHeight: "5.5rem", letterSpacing: "-0.02em" }],
        "display-xl": ["4rem", { lineHeight: "4.5rem", letterSpacing: "-0.02em" }],
        "display-l": ["3rem", { lineHeight: "3.5rem", letterSpacing: "-0.015em" }],
        "display-m": ["2.25rem", { lineHeight: "2.75rem", letterSpacing: "-0.01em" }],
        "heading-l": ["1.75rem", { lineHeight: "2.25rem", letterSpacing: "-0.01em" }],
        "heading-m": ["1.375rem", { lineHeight: "1.875rem" }],
        "heading-s": ["1.125rem", { lineHeight: "1.625rem" }],
        "body-l": ["1.125rem", { lineHeight: "1.75rem" }],
        body: ["1rem", { lineHeight: "1.625rem" }],
        "body-s": ["0.875rem", { lineHeight: "1.375rem" }],
        caption: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.04em" }],
        label: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.08em" }],
      },

      spacing: {
        "section-sm": "4rem",
        "section-md": "6rem",
        "section-lg": "8rem",
        "section-xl": "10rem",
      },

      maxWidth: {
        editorial: "1440px",
        prose: "68ch",
      },

      borderRadius: {
        none: "0",
        "2xs": "2px",
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
        full: "9999px",
      },

      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.4)",
        float: "0 8px 32px rgba(0,0,0,0.5)",
        overlay: "0 24px 64px rgba(0,0,0,0.7)",
        glow: "0 0 32px rgba(200,169,126,0.25)",
        "glow-lg": "0 0 64px rgba(200,169,126,0.2)",
      },

      transitionTimingFunction: {
        editorial: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        reveal: "cubic-bezier(0.16, 1, 0.3, 1)",
      },

      transitionDuration: {
        "75": "75ms",
        "150": "150ms",
        "250": "250ms",
        "350": "350ms",
        "450": "450ms",
        "600": "600ms",
      },

      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleReveal: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        revealUp: {
          "0%": { opacity: "0", transform: "translateY(32px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },

      animation: {
        "fade-in": "fadeIn 0.4s ease-out forwards",
        "fade-in-up": "fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in-down": "fadeInDown 0.3s ease-out forwards",
        "scale-reveal": "scaleReveal 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        shimmer: "shimmer 2s linear infinite",
        marquee: "marquee 30s linear infinite",
        "reveal-up": "revealUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "slide-in-right": "slideInRight 0.3s ease-out forwards",
      },

      aspectRatio: {
        "3/4": "3 / 4",
        "4/5": "4 / 5",
        "2/3": "2 / 3",
        "16/9": "16 / 9",
        "21/9": "21 / 9",
      },

      gridTemplateColumns: {
        "editorial-3": "2fr 1fr 1fr",
        "editorial-4": "1fr 2fr 1fr 1fr",
      },

      zIndex: {
        dropdown: "1000",
        sticky: "1020",
        fixed: "1030",
        overlay: "1040",
        modal: "1050",
        popover: "1060",
        toast: "1070",
      },
    },
  },
  plugins: [],
};

export default config;
