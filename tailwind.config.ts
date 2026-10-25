import type { Config } from "tailwindcss";

const token = (name: string) => `rgb(var(--kb-${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        kb: {
          night: "#a50e1c",
          brand: "#c8102e",
          "brand-dark": "#9c0b22",
          foam: "#ffffff",
          bg: token("bg"),
          panel: token("panel"),
          raised: token("raised"),
          field: token("field"),
          line: token("line"),
          hover: token("hover"),
          ink: token("ink"),
          muted: token("muted"),
          placeholder: token("placeholder"),
          "brand-soft": token("brand-soft"),
          cost: token("cost"),
          ok: token("ok"),
          warn: token("warn"),
          danger: token("danger"),
          info: token("info"),
          "error-bg": token("error-bg"),
          "error-line": token("error-line"),
          "ok-bg": token("ok-bg"),
          "ok-line": token("ok-line"),
        },
      },
    },
  },
  plugins: [],
};
export default config;
