import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#1a1a1a",
          dim: "#141414",
          bright: "#262626",
          container: "#222222",
          "container-low": "#1c1c1c",
          "container-high": "#2c2c2c",
          "container-lowest": "#111111",
          "container-highest": "#333333",
          variant: "#333333",
        },
        "on-surface": {
          DEFAULT: "#f5f5f5",
          variant: "#b0b0b0",
        },
        "on-background": "#f5f5f5",
        background: "#1a1a1a",
        primary: {
          DEFAULT: "#e0e0e0",
          container: "#444444",
        },
        "on-primary": {
          DEFAULT: "#1a1a1a",
          container: "#f5f5f5",
        },
        secondary: "#a0a0a0",
        "on-secondary": "#1a1a1a",
        tertiary: "#a0a0a0",
        outline: {
          DEFAULT: "#888888",
          variant: "#444444",
        },
        error: {
          DEFAULT: "#ffb4ab",
          container: "#93000a",
        },
        "on-error": "#690005",
        "inverse-surface": "#f5f5f5",
        "inverse-on-surface": "#1a1a1a",
        light: {
          surface: "#fbf9f5",
          "surface-dim": "#dbdad6",
          "on-surface": "#1b1c1a",
          primary: "#5e5f5a",
          outline: "#767872",
          "outline-variant": "#c6c7c0",
          error: "#ba1a1a",
        },
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
        /** Must stay extra-large so `rounded-full` is circular, not a fixed squircle. */
        full: "9999px",
      },
      spacing: {
        margin: "32px",
        unit: "4px",
        gutter: "16px",
        "component-gap": "24px",
      },
      fontFamily: {
        "label-caps": ["Inter", "sans-serif"],
        "body-main": ["Inter", "sans-serif"],
        "data-mono": ["Space Grotesk", "monospace"],
        "heading-display": ["Inter", "sans-serif"],
      },
      fontSize: {
        "label-caps": [
          "11px",
          { lineHeight: "1", letterSpacing: "0.1em", fontWeight: "700" },
        ],
        "body-main": [
          "15px",
          { lineHeight: "1.5", letterSpacing: "0em", fontWeight: "400" },
        ],
        "data-mono": [
          "13px",
          { lineHeight: "1.4", letterSpacing: "0.05em", fontWeight: "500" },
        ],
        "heading-display": [
          "24px",
          { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "600" },
        ],
      },
      screens: {
        // touch = mobile phones + iPads (pointer: coarse trick for iPad landscape)
        touch: { raw: '(max-width: 1024px), (pointer: coarse) and (max-width: 1366px)' },
        // mouse = desktop with a pointer device
        mouse: { raw: '(min-width: 1025px) and (pointer: fine), (min-width: 1367px)' },
      },
    },
  },
  plugins: [],
};

export default config;
