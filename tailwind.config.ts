import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        page: "var(--page)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        tile: "var(--tile)",
        border: "var(--border)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        accent: "var(--accent)",
        "accent-strong": "var(--accent-strong)",
        "accent-bg": "var(--accent-bg)",
        good: "var(--good)",
        "good-bg": "var(--good-bg)",
        danger: "var(--danger)",
        "danger-bg": "var(--danger-bg)",
        warn: "var(--warn)",
        "warn-bg": "var(--warn-bg)",
      },
    },
  },
  plugins: [],
};
export default config;
