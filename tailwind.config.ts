import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {
      colors: {
        theme: "rgb(var(--theme-color))",
        red: "rgb(var(--theme-red))",
        blue: "rgb(var(--theme-blue))",
        orange: "rgb(var(--theme-orange))",
      },
    },
    fontFamily: {
      mono: ["Fira Code VF", "monospace"],
    },
  },
  plugins: [],
} as Config;
