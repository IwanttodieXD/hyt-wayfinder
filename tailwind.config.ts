import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        // Always-literal white (QR code backgrounds, text on saturated buttons)
        paper: "rgb(var(--paper) / <alpha-value>)",
        // Surface + text scale (theme-driven)
        navy: {
          950: "rgb(var(--navy-950) / <alpha-value>)",
          900: "rgb(var(--navy-900) / <alpha-value>)",
          800: "rgb(var(--navy-800) / <alpha-value>)",
          700: "rgb(var(--navy-700) / <alpha-value>)",
          600: "rgb(var(--navy-600) / <alpha-value>)",
          500: "rgb(var(--navy-500) / <alpha-value>)",
          400: "rgb(var(--navy-400) / <alpha-value>)",
          300: "rgb(var(--navy-300) / <alpha-value>)",
          200: "rgb(var(--navy-200) / <alpha-value>)",
        },
        // Override built-in white so text-white adapts to the theme
        white: "rgb(var(--white) / <alpha-value>)",
        // Primary accent scale. Light mode darkens the text steps (200-400)
        // for contrast on light surfaces; the fill steps (500-600) stay golden
        // in both themes so buttons read the same everywhere.
        yellow: {
          50: "rgb(var(--yellow-50) / <alpha-value>)",
          100: "rgb(var(--yellow-100) / <alpha-value>)",
          200: "rgb(var(--yellow-200) / <alpha-value>)",
          300: "rgb(var(--yellow-300) / <alpha-value>)",
          400: "rgb(var(--yellow-400) / <alpha-value>)",
          500: "rgb(var(--yellow-500) / <alpha-value>)",
          600: "rgb(var(--yellow-600) / <alpha-value>)",
          700: "rgb(var(--yellow-700) / <alpha-value>)",
          800: "rgb(var(--yellow-800) / <alpha-value>)",
          900: "rgb(var(--yellow-900) / <alpha-value>)",
          950: "rgb(var(--yellow-950) / <alpha-value>)",
        },
        red: {
          300: "rgb(var(--red-300) / <alpha-value>)",
          400: "rgb(var(--red-400) / <alpha-value>)",
          500: "rgb(var(--red-500) / <alpha-value>)",
          600: "rgb(var(--red-600) / <alpha-value>)",
        },
        green: {
          300: "rgb(var(--green-300) / <alpha-value>)",
          400: "rgb(var(--green-400) / <alpha-value>)",
          500: "rgb(var(--green-500) / <alpha-value>)",
          600: "rgb(var(--green-600) / <alpha-value>)",
        },
        // Role-badge accents (not remapped elsewhere)
        blue: {
          100: "rgb(var(--blue-100) / <alpha-value>)",
          200: "rgb(var(--blue-200) / <alpha-value>)",
          300: "rgb(var(--blue-300) / <alpha-value>)",
          400: "rgb(var(--blue-400) / <alpha-value>)",
          500: "rgb(var(--blue-500) / <alpha-value>)",
          600: "rgb(var(--blue-600) / <alpha-value>)",
          700: "rgb(var(--blue-700) / <alpha-value>)",
          800: "rgb(var(--blue-800) / <alpha-value>)",
          900: "rgb(var(--blue-900) / <alpha-value>)",
        },
        teal: {
          300: "rgb(var(--teal-300) / <alpha-value>)",
          500: "rgb(var(--teal-500) / <alpha-value>)",
        },
        purple: {
          300: "rgb(var(--purple-300) / <alpha-value>)",
          500: "rgb(var(--purple-500) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
