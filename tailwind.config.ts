import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1a1a2e",
        muted: "#4a5568",
        accent: "#2563EB",
        "accent-hover": "#1D4ED8",
        paper: "#FAFAF9",
        card: "#FFFFFF",
        line: "#E5E5E4",
      },
      fontFamily: {
        serif: ["var(--font-source-serif)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
