import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0f1419",
        surface: "#1a2332",
        border: "#2d3a4d",
        text: "#e7e9ea",
        muted: "#8b98a5",
        accent: "#1d9bf0",
        positive: "#00ba7c",
        negative: "#f4212e",
      },
    },
  },
  plugins: [],
};

export default config;
